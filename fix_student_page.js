const fs = require('fs');
let code = fs.readFileSync('src/app/live/page.tsx', 'utf-8');

const replacement = `
                {/* Interactive WebRTC Room - Opens in New Tab */}
                {getActiveStream(cls).id === 'webrtc' && cls.status === 'live' && (
                  <div className="w-full mb-4 flex flex-col items-center justify-center p-12 bg-black rounded-xl border border-zinc-800">
                    <Video className="w-12 h-12 text-emerald-500 mb-4 animate-pulse" />
                    <h3 className="text-xl font-bold text-white mb-2">Virtual Classroom is Active</h3>
                    <p className="text-zinc-400 mb-6 text-center max-w-md">Click the button below to join the interactive class. It will open in a new full-screen tab.</p>
                    <a href={\`/live/room/\${cls.id}\`} target="_blank" rel="noreferrer">
                      <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg px-8 py-6 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all hover:scale-105">
                        <Video className="w-5 h-5 mr-2" /> Join Classroom Now
                      </Button>
                    </a>
                  </div>
                )}
`;

// Replace the old LiveKitPlayer injection
code = code.replace(
  /\{\/\* Interactive WebRTC Room \*\/\}[\s\S]*?<\/div>\s*\)\}/,
  replacement
);

fs.writeFileSync('src/app/live/page.tsx', code, 'utf-8');
