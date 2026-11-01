const fs = require('fs');
let code = fs.readFileSync('src/app/live/page.tsx', 'utf-8');

// 1. Fix the fallback logic
code = code.replace(
  /const fallbackStreams = \[\];\s*fallbackStreams\.push\(\{ id: 'webrtc', label: 'Interactive', link: '', icon: 'Video' \}\);\s*if \(cls\.platform === 'youtube' && !isAndroidApp\) \{/g,
  `const fallbackStreams = [];
      if (cls.platform !== 'webrtc') {
        fallbackStreams.push({ id: 'webrtc', label: 'Interactive', link: '', icon: 'Video' });
      }
      if (cls.platform === 'youtube' && !isAndroidApp) {`
);

// 2. Hide the red button if platform is webrtc
code = code.replace(
  /\{cls\.status === 'live' && cls\.platform !== 'youtube' && cls\.platform !== 'rtmp' && cls\.platform !== 'zoom' && \(/g,
  "{cls.status === 'live' && cls.platform !== 'youtube' && cls.platform !== 'rtmp' && cls.platform !== 'zoom' && cls.platform !== 'webrtc' && ("
);

fs.writeFileSync('src/app/live/page.tsx', code, 'utf-8');
