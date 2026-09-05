const fs = require('fs');
const file = 'src/app/admin/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add states
content = content.replace(
  'const [bulkFolderId, setBulkFolderId] = useState("");',
  const [bulkFolderId, setBulkFolderId] = useState("");
  
  // Student Filters
  const [studentFilterBatch, setStudentFilterBatch] = useState("All");
  const [studentFilterStatus, setStudentFilterStatus] = useState("All");
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [selectedStudentInfo, setSelectedStudentInfo] = useState<any>(null);
);

// Filter logic
content = content.replace(
  'const handleSaveStudentAccess = async () => {',
  const filteredStudents = allStudents.filter(s => {
    const matchBatch = studentFilterBatch === "All" || s.graduationYear === studentFilterBatch;
    const matchStatus = studentFilterStatus === "All" || (studentFilterStatus === "Active" ? s.isApproved : !s.isApproved);
    const matchSearch = !studentSearchTerm || 
      (s.name?.toLowerCase().includes(studentSearchTerm.toLowerCase())) ||
      (s.studentId?.toLowerCase().includes(studentSearchTerm.toLowerCase())) ||
      (s.phone?.includes(studentSearchTerm)) ||
      (s.nicNumber?.includes(studentSearchTerm));
    return matchBatch && matchStatus && matchSearch;
  });

  const handleSaveStudentAccess = async () => {
);

// Update students tab rendering
const oldStudentsTabStart = '<CardContent className="pt-6">';
const oldStudentsTabEnd = '</div>\\n              \\n              <div className="mt-8 border-t border-border pt-6">';

let newStudentsTab = \<CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <Input 
                  placeholder="Search by ID, Name, Phone, NIC..." 
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  className="max-w-xs"
                />
                <select 
                  className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={studentFilterBatch}
                  onChange={(e) => setStudentFilterBatch(e.target.value)}
                >
                  <option value="All">All Batches</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                  <option value="2029">2029</option>
                </select>
                <select 
                  className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={studentFilterStatus}
                  onChange={(e) => setStudentFilterStatus(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-3 font-bold text-muted-foreground whitespace-nowrap">ID</th>
                      <th className="p-3 font-bold text-muted-foreground whitespace-nowrap">Name</th>
                      <th className="p-3 font-bold text-muted-foreground whitespace-nowrap">Batch</th>
                      <th className="p-3 font-bold text-muted-foreground whitespace-nowrap">Phone</th>
                      <th className="p-3 font-bold text-muted-foreground whitespace-nowrap">NIC</th>
                      <th className="p-3 font-bold text-muted-foreground whitespace-nowrap">Status</th>
                      <th className="p-3 font-bold text-muted-foreground whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(student => (
                      <tr key={student.id} className="border-b hover:bg-secondary/10 transition-colors text-sm">
                        <td className="p-3 font-mono text-primary whitespace-nowrap">{student.studentId || 'N/A'}</td>
                        <td className="p-3 font-medium min-w-[150px]">{student.name || student.email}</td>
                        <td className="p-3 whitespace-nowrap">{student.graduationYear || 'N/A'}</td>
                        <td className="p-3 whitespace-nowrap">{student.phone || 'N/A'}</td>
                        <td className="p-3 whitespace-nowrap">{student.nicNumber || 'N/A'}</td>
                        <td className="p-3 whitespace-nowrap">
                          {student.isApproved ? (
                            <span className="bg-green-500/20 text-green-600 px-2 py-1 rounded text-xs font-bold">Active</span>
                          ) : (
                            <span className="bg-yellow-500/20 text-yellow-600 px-2 py-1 rounded text-xs font-bold">Pending</span>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedStudentInfo(student)}
                              title="More Info"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedStudentForAccess(student);
                                setStudentFolderAccess(student.folderAccess || {});
                              }}
                            >
                              Access
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredStudents.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-muted-foreground">No students found matching filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-8 border-t border-border pt-6">\;

const regex = /<CardContent className="pt-6">[\\s\\S]*?<div className="mt-8 border-t border-border pt-6">/;
content = content.replace(regex, newStudentsTab);

// Add the student info modal at the bottom before final closing div
const modalHtml = \
      {/* Student Info Modal */}
      {selectedStudentInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <Card className="w-full max-w-2xl border-primary/20 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <CardHeader className="bg-secondary/20 border-b relative flex-shrink-0">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-4 top-4 rounded-full hover:bg-destructive/20 hover:text-destructive"
                onClick={() => setSelectedStudentInfo(null)}
              >
                <X className="w-5 h-5" />
              </Button>
              <CardTitle className="text-xl flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" /> 
                Student Details
              </CardTitle>
              <CardDescription>
                Detailed information for {selectedStudentInfo.name} ({selectedStudentInfo.studentId || 'N/A'})
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Full Name</p>
                  <p className="font-medium text-base">{selectedStudentInfo.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Email</p>
                  <p className="font-medium text-base">{selectedStudentInfo.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Student Phone</p>
                  <p className="font-medium text-base">{selectedStudentInfo.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Parent Phone</p>
                  <p className="font-medium text-base">{selectedStudentInfo.parentPhone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">NIC Number</p>
                  <p className="font-medium text-base">{selectedStudentInfo.nicNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Batch / Class ID</p>
                  <p className="font-medium text-base">{selectedStudentInfo.graduationYear || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground mb-1">Address</p>
                  <p className="font-medium text-base">{selectedStudentInfo.address || 'N/A'}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-bold text-lg mb-2">Payment History</h3>
                {allPayments.filter(p => p.studentId === selectedStudentInfo.id).length > 0 ? (
                  <div className="space-y-2">
                    {allPayments.filter(p => p.studentId === selectedStudentInfo.id).map(payment => (
                      <div key={payment.id} className="flex justify-between items-center bg-secondary/10 p-3 rounded-lg border border-secondary/20">
                        <div>
                          <p className="font-bold text-sm">{folders.find(f => f.id === payment.folderId)?.name || 'Unknown Folder'}</p>
                          <p className="text-xs text-muted-foreground">{new Date(payment.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold font-mono">
                            {payment.status === 'approved' ? (
                              <span className="text-green-500 bg-green-500/10 px-2 py-1 rounded">Approved</span>
                            ) : payment.status === 'rejected' ? (
                              <span className="text-red-500 bg-red-500/10 px-2 py-1 rounded">Rejected</span>
                            ) : (
                              <span className="text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">Pending</span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm italic">No payment history found for this student.</p>
                )}
              </div>

            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
\;

content = content.replace(/\\s*<\\/div>\\s*<\\/div>\\s*\\);\\s*}\\s*$/, modalHtml);

fs.writeFileSync(file, content);
console.log('Patched');
