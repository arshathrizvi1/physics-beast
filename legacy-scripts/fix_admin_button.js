const fs = require('fs');
let code = fs.readFileSync('src/app/admin/live/page.tsx', 'utf-8');

const webrtcButtonCode = `
                      {cls.status === 'live' && cls.platform === 'webrtc' && (
                        <Link href="/live" target="_blank" className="w-full">
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white w-full animate-pulse shadow-lg font-bold border-2 border-emerald-400">
                            <Video className="w-4 h-4 mr-2" /> Enter WebRTC Studio
                          </Button>
                        </Link>
                      )}
`;

// Insert the WebRTC button right after the "End Broadcast" button logic
code = code.replace(
  /\{cls\.status === 'live' && \(\s*<Button size="sm" onClick=\{\(\) => updateStatus\(cls\.id, 'ended'\)\} variant="outline" className="border-red-500\/50 text-red-500 hover:bg-red-500 hover:text-foreground w-full">\s*<StopCircle className="w-4 h-4 mr-2" \/> End Broadcast\s*<\/Button>\s*\)\}/,
  `{cls.status === 'live' && (
                        <Button size="sm" onClick={() => updateStatus(cls.id, 'ended')} variant="outline" className="border-red-500/50 text-red-500 hover:bg-red-500 hover:text-foreground w-full">
                          <StopCircle className="w-4 h-4 mr-2" /> End Broadcast
                        </Button>
                      )}
                      ${webrtcButtonCode}`
);

fs.writeFileSync('src/app/admin/live/page.tsx', code, 'utf-8');
