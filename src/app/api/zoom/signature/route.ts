// @ts-nocheck
import { NextResponse } from 'next/server';
import { KJUR } from 'jsrsasign';
import { adminDb } from '@/lib/firebase-admin';
import { withZeroTrustGate, parseAndVerifyJsonBody } from '@/security/zero-trust-gate';
import { appendAuditLog } from '@/security/audit-ledger';

export const POST = withZeroTrustGate(
  {
    scope: 'zoom_signature',
    limit: 30,
    windowMs: 60 * 1000,
    requireAuth: 'authenticated',
  },
  async (req, ctx) => {
    try {
      const parsed = await parseAndVerifyJsonBody<{ meetingNumber?: string | number; role?: number }>(req, ctx);
      if (!parsed.ok) return parsed.response;

      const rawMeeting = String(parsed.body.meetingNumber || '').replace(/[\s-]/g, '');
      if (!rawMeeting || !/^\d{9,11}$/.test(rawMeeting)) {
        return NextResponse.json({ error: 'Valid numeric meetingNumber (9-11 digits) is required' }, { status: 400 });
      }

      // Privilege Escalation Defense: Only admin or teacher accounts can mint Host (role=1) signatures
      const requestedRole = Number(parsed.body.role || 0);
      const isTeacherOrAdmin = ctx.caller && (ctx.caller.role === 'admin' || ctx.caller.role === 'teacher' || ctx.caller.isAdmin);
      
      let effectiveRole = 0; // Default to attendee
      if (requestedRole === 1) {
        if (!isTeacherOrAdmin) {
          await appendAuditLog({
            traceId: ctx.traceId,
            severity: 'HIGH',
            eventType: 'UNAUTHORIZED_ADMIN_ATTEMPT',
            ip: ctx.ip,
            fingerprint: ctx.fingerprint,
            path: '/api/zoom/signature',
            method: 'POST',
            details: {
              reason: 'NON_PRIVILEGED_USER_REQUESTED_ZOOM_HOST_ROLE',
              callerUid: ctx.caller?.uid,
              callerEmail: ctx.caller?.email,
              meetingNumber: rawMeeting,
            },
          });
          effectiveRole = 0; // Downgrade to attendee
        } else {
          effectiveRole = 1;
        }
      }

      let sdkKey = process.env.ZOOM_SDK_KEY;
      let sdkSecret = process.env.ZOOM_SDK_SECRET;

      // Fetch from Firebase settings
      try {
        const settingsDoc = await adminDb.collection('settings').doc('zoom').get();
        if (settingsDoc.exists) {
          const data = settingsDoc.data();
          if (data?.sdkKey && data?.sdkSecret) {
            sdkKey = data.sdkKey;
            sdkSecret = data.sdkSecret;
          }
        }
      } catch (e) {
        console.warn('Failed to fetch zoom keys from Firebase:', e);
      }

      if (!sdkKey || !sdkSecret) {
        console.warn('ZOOM_SDK_KEY or ZOOM_SDK_SECRET is missing.');
        return NextResponse.json({ error: 'SDK credentials not configured' }, { status: 500 });
      }

      const iat = Math.round(new Date().getTime() / 1000) - 30;
      const exp = iat + 60 * 60 * 2; // 2 hours

      const oHeader = { alg: 'HS256', typ: 'JWT' };

      const oPayload = {
        sdkKey: sdkKey,
        appKey: sdkKey,
        mn: rawMeeting,
        role: effectiveRole,
        iat: iat,
        exp: exp,
        tokenExp: exp,
      };

      const sHeader = JSON.stringify(oHeader);
      const sPayload = JSON.stringify(oPayload);
      const signature = KJUR.jws.JWS.sign('HS256', sHeader, sPayload, sdkSecret);

      return NextResponse.json({ signature, sdkKey, role: effectiveRole });
    } catch (error) {
      console.error('Zoom Signature Error:', error);
      return NextResponse.json({ error: 'Failed to generate Zoom signature' }, { status: 500 });
    }
  }
);
