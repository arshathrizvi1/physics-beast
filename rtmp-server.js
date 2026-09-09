const NodeMediaServer = require('node-media-server');
const fs = require('fs');
const path = require('path');
const http = require('http');

try {
  process.loadEnvFile('.env.local');
} catch (e) {
  try { process.loadEnvFile('.env'); } catch (err) {}
}

const config = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8000,
    allow_origin: '*',
    mediaroot: './media'
  },
  trans: {
    ffmpeg: 'ffmpeg', // Must be in PATH
    tasks: [
      {
        app: 'live',
        hls: true,
        hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
        hlsKeep: false,
        mp4: true,
        mp4Flags: '[movflags=frag_keyframe+empty_moov]',
      }
    ]
  }
};

const nms = new NodeMediaServer(config);
nms.run();

nms.on('donePublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on donePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
  
  const streamKey = StreamPath.split('/').pop();
  
  // Wait a few seconds to let ffmpeg finish writing the mp4 file
  setTimeout(() => {
    try {
      const liveDir = path.join(__dirname, 'media', 'live', streamKey);
      if (!fs.existsSync(liveDir)) {
        console.log(`Directory ${liveDir} does not exist. No recording found.`);
        return;
      }

      const files = fs.readdirSync(liveDir);
      const mp4File = files.find(f => f.endsWith('.mp4'));
      
      if (!mp4File) {
        console.log(`No mp4 file found in ${liveDir}`);
        return;
      }

      const filePath = path.join(liveDir, mp4File);
      console.log(`Stream ended. Found recording: ${filePath}. Triggering upload API...`);

      // Call our Next.js API to handle the Bunny upload and Firebase updates
      const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/live/upload-recording',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => console.log('Upload API Response:', data));
      });

      req.on('error', (e) => console.error(`Problem with request: ${e.message}`));
      req.write(JSON.stringify({ streamKey, filePath: path.resolve(filePath) }));
      req.end();

    } catch (e) {
      console.error("Error processing stream end", e);
    }
  }, 5000);
});
