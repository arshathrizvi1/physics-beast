# Master Secure Image & Medical Media Upload Architecture
*10-Pillar Zero-Trust Guard for Patient Prescriptions, Lab Reports, and Medical Consultation Media.*

---

## 1. Threat Model & Attack Vectors

Medical portals and consultation chats are high-value targets for file upload attacks:
1. **MIME-Spoofing & Extension Renaming**: An attacker renames `payload.exe` or `exploit.php` to `prescription.png`.
2. **SVG Stored XSS**: SVG images containing embedded `<script>alert(document.cookie)</script>` or malicious onload attributes.
3. **Zip-Bombs & Image Decompression DoS**: Pixel bombs (e.g. 100,000 x 100,000 px PNG with 50KB compressed size) that consume gigabytes of RAM upon decompression.
4. **Path Traversal & Filename Tampering**: Filenames containing `../../etc/passwd` or null bytes (`%00`) intended to overwrite server configuration.
5. **EXIF Metadata Information Leakage**: GPS coordinates, camera serial numbers, and patient PII embedded in JPEG/TIFF headers.
6. **Storage Exhaustion**: Flooding buckets with oversized files to trigger billing denial of service.

---

## 2. The 10-Point Secure Upload Architecture

### Pillar 1: Binary Magic-Byte Inspection
Never trust `file.type` or `file.name` supplied by the browser. Read the first 12 bytes of the raw binary stream:
- **PNG**: `89 50 4E 47 0D 0A 1A 0A`
- **JPEG / JPG**: `FF D8 FF`
- **WEBP**: `52 49 46 46` at byte 0, followed by `57 45 42 50` at byte 8
- **GIF**: `47 49 46 38` ("GIF8")
- **PDF**: `25 50 44 46` ("%PDF")

### Pillar 2: Strict MIME Whitelist
Explicitly permit only the following safe formats:
```javascript
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'application/pdf',
]);
```

### Pillar 3: Complete SVG Script & Active Content Rejection
SVG is XML-based and can execute arbitrary JavaScript. For medical prescriptions and consultation media:
- Either reject SVG completely (recommended for patient uploads), OR
- Pass SVG through strict XML sanitizers that strip `<script>`, `<foreignObject>`, `on*` event handlers, and `javascript:` URIs.

### Pillar 4: Strict 5 MB Upload Ceiling
Enforce a hard maximum file size limit of 5 MB (5,242,880 bytes). Reject oversized uploads immediately before buffering or parsing.

### Pillar 5: Path Traversal & Filename Sanitization
Strip all path traversal characters (`..`, `/`, `\`, null bytes `%00`). Generate a collision-resistant UUID storage key:
```javascript
// Output format: uploads/{category}/{timestamp}-{randomHash}.{ext}
const safeKey = `uploads/consultations/${Date.now()}-${crypto.randomUUID()}.${safeExt}`;
```

### Pillar 6: EXIF Metadata Sanitization
Before persisting image files, strip EXIF GPS coordinates, patient device serial numbers, and timestamps to protect patient HIPAA privacy.

### Pillar 7: Client-Side Pre-Validation & Zero-Trust Verification
Perform pre-validation in the UI before transmission, and re-verify 100% on the server edge. Never bypass server validation.

### Pillar 8: Content-Disposition & Sandbox Headers
Serve uploaded patient files with safe headers preventing inline script execution:
```http
Content-Disposition: attachment; filename="sanitized_prescription.png"
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox
```

### Pillar 9: Rate Limiting & Abuse Throttling
Limit uploads to a maximum of 10 uploads per 10 minutes per IP subnet to prevent storage exhaustion attacks.

### Pillar 10: Immutable Hash-Chained Audit Logging
Record every upload event in the cryptographic audit ledger: timestamp, file SHA-256 hash, byte size, verified MIME type, patient ID, and client IP subnet.
