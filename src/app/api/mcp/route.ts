import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Attempt client authentication fallback if admin credentials are provided via email/password
async function ensureAdminAuth() {
  const adminEmail = process.env.FIREBASE_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
  const adminPassword = process.env.FIREBASE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  if (adminEmail && adminPassword && !auth.currentUser) {
    try {
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    } catch (e: any) {
      console.warn("Admin Auth Fallback failed to sign in:", e.message);
    }
  }
}

// CORS headers to permit Gemini web app and Google proxies
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, mcp-session-id',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// Available MCP Tools exposed to Gemini
const TOOLS = [
  {
    name: 'search_student',
    description: 'Search for students in Brilliant Academy LMS by name (e.g. "SF Samha"), email, phone number, or batch year.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Name, email, phone, or search keyword for the student (e.g. "SF Samha", "Samha").',
        },
        batchYear: {
          type: 'string',
          description: 'Optional batch or graduation year filter (e.g. "2026").',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_student_details',
    description: 'Retrieve full details for a student including profile data, enrolled courses, batch, arrears/fees, and approval status.',
    inputSchema: {
      type: 'object',
      properties: {
        studentId: {
          type: 'string',
          description: 'The unique ID of the student user document.',
        },
        studentName: {
          type: 'string',
          description: 'Name of the student if ID is not known.',
        },
      },
    },
  },
  {
    name: 'manage_student_arrears',
    description: 'Add, deduct, update, or completely clear arrears (overdue fees) for a student and subject in the database.',
    inputSchema: {
      type: 'object',
      properties: {
        studentIdentifier: {
          type: 'string',
          description: 'Student ID, Name, or Email (e.g. "SF Samha").',
        },
        subjectOrCourse: {
          type: 'string',
          description: 'Subject, Course, or description (e.g. "Grade 6 Maths", "Physics").',
        },
        amount: {
          type: 'number',
          description: 'The amount of arrears to remove, add, or set (e.g. 150).',
        },
        action: {
          type: 'string',
          enum: ['remove', 'clear_all', 'set', 'add'],
          description: 'Action to perform: "remove" (deduct/remove specified arrears), "clear_all" (wipe all arrears to 0), "set" (set exact value), "add" (add arrears).',
        },
        notes: {
          type: 'string',
          description: 'Optional admin reason or note for this arrears adjustment.',
        },
      },
      required: ['studentIdentifier', 'action'],
    },
  },
  {
    name: 'list_courses_and_batches',
    description: 'List all available courses, subjects, streams, and batches in Brilliant Academy LMS.',
    inputSchema: {
      type: 'object',
      properties: {
        batchYear: {
          type: 'string',
          description: 'Optional filter by batch year.',
        },
      },
    },
  },
  {
    name: 'update_student_profile',
    description: 'Update student profile fields such as name, phone, school, batch, or status in the database.',
    inputSchema: {
      type: 'object',
      properties: {
        studentIdentifier: {
          type: 'string',
          description: 'Student ID, Name, or Email.',
        },
        updates: {
          type: 'object',
          description: 'Key-value pairs to update (e.g. { "isApproved": true, "school": "Rahula" }).',
        },
      },
      required: ['studentIdentifier', 'updates'],
    },
  },
];

// Helper: Find a student by ID, Name, or Email
async function findStudent(identifier: string) {
  const clean = identifier.trim();
  
  // 1. Direct ID lookup
  try {
    const docSnap = await adminDb.collection('users').doc(clean).get();
    if (docSnap.exists) {
      return { id: docSnap.id, ...(docSnap.data() as any) };
    }
  } catch {}

  // 2. Query by email
  try {
    const emailSnap = await adminDb.collection('users').where('email', '==', clean.toLowerCase()).get();
    if (!emailSnap.empty) {
      const d = emailSnap.docs[0];
      return { id: d.id, ...d.data() };
    }
  } catch {}

  // 3. Query all students and search by name (fuzzy case-insensitive)
  try {
    const snap = await adminDb.collection('users').where('role', '==', 'student').get();
    const students = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
    
    // Exact match
    const exact = students.find(s => (s.name || '').toLowerCase() === clean.toLowerCase());
    if (exact) return exact;

    // Substring match
    const cleanLower = clean.toLowerCase();
    const matches = students.filter(s => {
      const name = (s.name || '').toLowerCase();
      return name.includes(cleanLower) || cleanLower.includes(name);
    });

    if (matches.length > 0) return matches[0];
  } catch (err: any) {
    console.error("Error in findStudent:", err);
  }

  // 4. Fallback search across all users regardless of role (in case role is missing)
  try {
    const allUsersSnap = await adminDb.collection('users').get();
    const cleanLower = clean.toLowerCase();
    const allUsers = allUsersSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
    const match = allUsers.find(u => {
      const n = (u.name || '').toLowerCase();
      const e = (u.email || '').toLowerCase();
      const p = (u.phone || '').toString();
      return n.includes(cleanLower) || cleanLower.includes(n) || e === cleanLower || p === clean;
    });
    if (match) return match;
  } catch {}

  // 5. Fallback search in 'students' collection
  try {
    const stSnap = await adminDb.collection('students').get();
    const cleanLower = clean.toLowerCase();
    const stList = stSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
    const match = stList.find(s => {
      const n = (s.name || '').toLowerCase();
      return n.includes(cleanLower) || cleanLower.includes(n);
    });
    if (match) return match;
  } catch {}

  return null;
}

// Tool Execution Dispatcher
async function executeTool(name: string, args: any) {
  switch (name) {
    case 'search_student': {
      const query = (args.query || '').trim().toLowerCase();
      
      // Query users collection
      let allStudents: any[] = [];
      try {
        const snap = await adminDb.collection('users').get();
        allStudents = snap.docs
          .map(d => ({ id: d.id, ...(d.data() as any) }))
          .filter(u => !u.role || u.role === 'student');
      } catch (e) {
        console.warn("Failed to fetch users:", e);
      }

      // Also include students collection if any
      try {
        const stSnap = await adminDb.collection('students').get();
        const stList = stSnap.docs.map(d => ({ id: d.id, isStudentDoc: true, ...(d.data() as any) }));
        allStudents = [...allStudents, ...stList];
      } catch {}

      const results = allStudents.filter(s => {
        const sName = (s.name || '').toLowerCase();
        const sEmail = (s.email || '').toLowerCase();
        const sPhone = (s.phone || '').toString();
        const sBatch = (s.graduationYear || s.grade || '').toString();

        const matchQuery = !query || sName.includes(query) || sEmail.includes(query) || sPhone.includes(query);
        const matchBatch = !args.batchYear || sBatch === args.batchYear;
        return matchQuery && matchBatch;
      }).slice(0, 10);

      if (results.length === 0) {
        return `No students found matching "${args.query}". Checked ${allStudents.length} student records in database.`;
      }

      return JSON.stringify(
        results.map(s => ({
          id: s.id,
          name: s.name || 'Unnamed',
          email: s.email,
          phone: s.phone || 'N/A',
          batchYear: s.graduationYear || 'N/A',
          school: s.school || 'N/A',
          stream: s.stream || 'N/A',
          isApproved: !!s.isApproved,
          arrears: s.arrears ?? s.fees ?? s.dueAmount ?? 0,
          folderAccessCount: Object.keys(s.folderAccess || {}).length,
        })),
        null,
        2
      );
    }

    case 'get_student_details': {
      const identifier = args.studentId || args.studentName;
      if (!identifier) return 'Error: studentId or studentName is required.';

      const student = await findStudent(identifier);
      if (!student) return `Student "${identifier}" not found in the database.`;

      return JSON.stringify(
        {
          id: student.id,
          name: student.name,
          email: student.email,
          phone: student.phone,
          parentPhone: student.parentPhone,
          batchYear: student.graduationYear,
          school: student.school,
          stream: student.stream,
          isApproved: student.isApproved,
          arrears: student.arrears ?? student.dueAmount ?? 0,
          arrearsDetails: student.arrearsDetails || student.subjectArrears || null,
          folderAccess: student.folderAccess || {},
          accessibleCourses: student.accessibleCourses || [],
        },
        null,
        2
      );
    }

    case 'manage_student_arrears': {
      const identifier = args.studentIdentifier;
      const student = await findStudent(identifier);
      if (!student) {
        return `Error: Could not locate student "${identifier}" in Brilliant Academy LMS database.`;
      }

      const subject = args.subjectOrCourse || 'General';
      const amount = Number(args.amount || 0);
      const action = args.action;

      let currentArrears = student.arrears;
      let subjectArrears = { ...(student.subjectArrears || student.arrearsDetails || {}) };

      let updatedArrearsValue: any;
      let message = '';

      if (action === 'clear_all') {
        updatedArrearsValue = 0;
        subjectArrears = {};
        message = `Successfully cleared all arrears for ${student.name} (${student.email}). Balance is now 0.`;
      } else if (action === 'remove') {
        if (typeof currentArrears === 'number') {
          updatedArrearsValue = Math.max(0, currentArrears - amount);
        } else {
          updatedArrearsValue = 0;
        }

        if (subjectArrears[subject]) {
          delete subjectArrears[subject];
        }

        message = `Successfully removed ${amount} arrears for ${subject} from student ${student.name} (${student.email}). New arrears total: ${updatedArrearsValue}.`;
      } else if (action === 'set') {
        updatedArrearsValue = amount;
        subjectArrears[subject] = amount;
        message = `Set arrears for ${subject} to ${amount} for student ${student.name}.`;
      } else if (action === 'add') {
        const prev = typeof currentArrears === 'number' ? currentArrears : 0;
        updatedArrearsValue = prev + amount;
        subjectArrears[subject] = (subjectArrears[subject] || 0) + amount;
        message = `Added ${amount} arrears for ${subject} to student ${student.name}. Total: ${updatedArrearsValue}.`;
      }

      // Perform update with Admin privileges
      const targetCol = student.isStudentDoc ? 'students' : 'users';
      await adminDb.collection(targetCol).doc(student.id).update({
        arrears: updatedArrearsValue,
        subjectArrears: subjectArrears,
        lastArrearsUpdate: {
          timestamp: Date.now(),
          action,
          amount,
          subject,
          notes: args.notes || 'Updated via Gemini MCP integration',
        },
      });

      return message;
    }

    case 'list_courses_and_batches': {
      const [coursesSnap, batchesSnap, subjectsSnap] = await Promise.all([
        adminDb.collection('courses').get(),
        adminDb.collection('batches').get(),
        adminDb.collection('subjects').get(),
      ]);

      const courses = coursesSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      const batches = batchesSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      const subjects = subjectsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

      return JSON.stringify({
        totalCourses: courses.length,
        courses: courses.map(c => ({ id: c.id, name: c.name, batchId: c.batchId, subjectId: c.subjectId })),
        batches: batches.map(b => ({ id: b.id, name: b.name, year: b.year })),
        subjects: subjects.map(s => ({ id: s.id, name: s.name })),
      }, null, 2);
    }

    case 'update_student_profile': {
      const student = await findStudent(args.studentIdentifier);
      if (!student) return `Student "${args.studentIdentifier}" not found.`;

      await adminDb.collection('users').doc(student.id).update({
        ...args.updates,
        updatedAt: Date.now(),
      });

      return `Successfully updated student record for ${student.name} (${student.id}).`;
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// GET handler: Health check, SSE handshake, and connector diagnostic
export async function GET(req: NextRequest) {
  const isSse = req.headers.get('accept')?.includes('text/event-stream');

  if (isSse) {
    // Return SSE stream connection if requested by MCP client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(`event: endpoint\ndata: /api/mcp\n\n`)
        );
      },
    });

    return new NextResponse(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  }

  // Standard JSON health check
  return NextResponse.json(
    {
      status: 'online',
      name: 'Brilliant Academy LMS MCP Server',
      version: '1.0.0',
      protocolVersion: '2024-11-05',
      endpoint: '/api/mcp',
      toolsCount: TOOLS.length,
      tools: TOOLS.map(t => ({ name: t.name, description: t.description })),
    },
    { headers: corsHeaders }
  );
}

// POST handler: JSON-RPC 2.0 processor for Model Context Protocol
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Support single request or batch requests
    const isBatch = Array.isArray(body);
    const requests = isBatch ? body : [body];

    const responses = await Promise.all(
      requests.map(async (rpc) => {
        const { jsonrpc = '2.0', id, method, params } = rpc;

        try {
          switch (method) {
            case 'initialize': {
              return {
                jsonrpc: '2.0',
                id,
                result: {
                  protocolVersion: '2024-11-05',
                  capabilities: {
                    tools: {
                      listChanged: false,
                    },
                  },
                  serverInfo: {
                    name: 'Brilliant Academy LMS',
                    version: '1.0.0',
                  },
                },
              };
            }

            case 'notifications/initialized': {
              return null; // MCP notifications require no response body
            }

            case 'ping': {
              return { jsonrpc: '2.0', id, result: {} };
            }

            case 'tools/list': {
              return {
                jsonrpc: '2.0',
                id,
                result: {
                  tools: TOOLS,
                },
              };
            }

            case 'tools/call': {
              const toolName = params?.name;
              const toolArgs = params?.arguments || {};

              if (!toolName) {
                return {
                  jsonrpc: '2.0',
                  id,
                  error: { code: -32602, message: 'Invalid params: name is required' },
                };
              }

              await ensureAdminAuth();

              try {
                const outputText = await executeTool(toolName, toolArgs);

                return {
                  jsonrpc: '2.0',
                  id,
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: typeof outputText === 'string' ? outputText : JSON.stringify(outputText, null, 2),
                      },
                    ],
                  },
                };
              } catch (toolErr: any) {
                const isPermError = toolErr?.message?.includes('Missing or insufficient permissions') || toolErr?.code === 'permission-denied';
                if (isPermError) {
                  return {
                    jsonrpc: '2.0',
                    id,
                    result: {
                      content: [
                        {
                          type: 'text',
                          text: `PERMISSION ALERT: The LMS database rejected access because Firebase Admin credentials are not yet configured in your production hosting environment (Vercel). \n\nTo resolve this permanently so Gemini can read and update student arrears:\n1. Open Firebase Console -> Project Settings -> Service accounts\n2. Click "Generate new private key"\n3. Open Vercel -> Project Settings -> Environment Variables\n4. Add FIREBASE_SERVICE_ACCOUNT_KEY with the downloaded JSON content (or set FIREBASE_ADMIN_EMAIL and FIREBASE_ADMIN_PASSWORD)\n5. Redeploy your site. Once added, Gemini will have full, unrestricted admin privileges to modify student records.`,
                        },
                      ],
                    },
                  };
                }
                throw toolErr;
              }
            }

            default:
              return {
                jsonrpc: '2.0',
                id,
                error: {
                  code: -32601,
                  message: `Method not found: ${method}`,
                },
              };
          }
        } catch (execErr: any) {
          console.error(`Error processing method ${method}:`, execErr);
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32000,
              message: execErr.message || 'Internal tool execution error',
            },
          };
        }
      })
    );

    // Filter out nulls from notifications
    const validResponses = responses.filter(Boolean);

    if (validResponses.length === 0) {
      return new NextResponse(null, { status: 204, headers: corsHeaders });
    }

    return NextResponse.json(isBatch ? validResponses : validResponses[0], {
      headers: corsHeaders,
    });
  } catch (err: any) {
    console.error('MCP API Router Error:', err);
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32700,
          message: 'Parse error: invalid JSON received',
        },
      },
      { status: 400, headers: corsHeaders }
    );
  }
}
