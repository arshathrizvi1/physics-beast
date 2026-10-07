const fs = require('fs');
let code = fs.readFileSync('src/app/admin/live/page.tsx', 'utf-8');

// Fix dropdown
code = code.replace(
  '<SelectItem value="rtmp">📡 RTMP Stream (OBS / Zoom Pro / StreamYard)</SelectItem>',
  '<SelectItem value="rtmp">📡 RTMP Stream (OBS / Zoom Pro / StreamYard)</SelectItem>\n                    <SelectItem value="webrtc">🎙️ Interactive Room (LiveKit WebRTC)</SelectItem>'
);

// Fix required link issue for WebRTC
code = code.replace(
  '<Input value={link} onChange={e => setLink(e.target.value)} required type="url" />',
  '<Input value={link} onChange={e => setLink(e.target.value)} required={platform !== "webrtc"} type={platform === "webrtc" ? "text" : "url"} disabled={platform === "webrtc"} placeholder={platform === "webrtc" ? "Auto-generated" : ""} />'
);

// Add description block for webrtc
const youtubeBlock = '{platform === "youtube" && (';
const webrtcBlock = `{platform === "webrtc" && (
                <div className="p-3.5 bg-green-500/10 border border-green-500/30 rounded-xl text-xs space-y-2">
                  <div className="font-bold text-green-600 flex items-center gap-1.5 text-sm">
                    <span>🎙️</span> Interactive Live Room (WebRTC)
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Uses the new 0-second delay WebRTC server. Students can raise their hands, turn on their cameras, and speak with you directly.
                  </p>
                </div>
              )}
              
              `;
code = code.replace(youtubeBlock, webrtcBlock + youtubeBlock);

fs.writeFileSync('src/app/admin/live/page.tsx', code, 'utf-8');
