const fs = require('fs');
let c = fs.readFileSync('src/components/LiveKitPlayer.tsx', 'utf8');

c = c.replace(
  "import { Track, RoomEvent } from 'livekit-client';",
  "import { Track, RoomEvent, VideoPresets, ScreenSharePresets } from 'livekit-client';"
);

c = c.replace(
  /<LiveKitRoom\n\s*video=\{isAdmin\}\n\s*audio=\{isAdmin\}\n\s*token=\{conn\.token\}/,
  `<LiveKitRoom
      video={isAdmin}
      audio={isAdmin}
      token={conn.token}
      options={{
        publishDefaults: {
          videoEncoding: VideoPresets.h1080.encoding,
          screenShareEncoding: ScreenSharePresets.h1080fps30.encoding,
          videoSimulcast: true, // Enables adaptive quality for students with bad internet
        },
        videoCaptureDefaults: {
          resolution: VideoPresets.h1080.resolution,
        }
      }}`
);

fs.writeFileSync('src/components/LiveKitPlayer.tsx', c);
console.log('Fixed LiveKitPlayer quality!');
