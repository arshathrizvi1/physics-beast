const fs = require('fs');
let code = fs.readFileSync('src/app/api/livekit/token/route.ts', 'utf-8');

code = code.replace(
  'const apiKey = process.env.LIVEKIT_API_KEY;',
  'const apiKey = "APIbrilliant"; // hardcoded to bypass vercel typos'
);

code = code.replace(
  'const apiSecret = process.env.LIVEKIT_API_SECRET;',
  'const apiSecret = "esDs-h5uEpAMt5oGWOJXx20TO5kcP7-mQPYVXwbBwro"; // hardcoded to bypass vercel typos'
);

fs.writeFileSync('src/app/api/livekit/token/route.ts', code, 'utf-8');
