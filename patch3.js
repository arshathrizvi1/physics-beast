const fs = require('fs');
let code = fs.readFileSync('rtmp-server/server.js', 'utf8');

const p1 = '  function runYtDlp(dlArgs, vidTitle, originalUrl, outPath, reqBody) {\n    console.log([Generic] Running yt-dlp for: );\n    const ytdlp = spawn(\'yt-dlp\', dlArgs);\n\n  ytdlp.stdout.on(\'data\', (data) => console.log([yt-dlp] ));\n  ytdlp.stderr.on(\'data\', (data) => console.error([yt-dlp stderr] ));\n\n  ytdlp.on(\'close\', async (code) => {\n    if (code === 0 && fs.existsSync(outputPath)) {';

const n1 = '  function runYtDlp(dlArgs, vidTitle, originalUrl, outPath, reqBody) {\n    let attempt = 1;\n    const maxAttempts = 12;\n\n    const attemptDownload = () => {\n      console.log([Generic] yt-dlp attempt / for: );\n      const ytdlp = spawn(\'yt-dlp\', dlArgs);\n      let stderrLog = "";\n\n      ytdlp.stdout.on(\'data\', (data) => console.log([yt-dlp] ));\n      ytdlp.stderr.on(\'data\', (data) => {\n        const msg = data.toString();\n        stderrLog += msg;\n        console.error([yt-dlp stderr] );\n      });\n\n      ytdlp.on(\'close\', async (code) => {\n        if (code === 0 && fs.existsSync(outputPath)) {';

const p2 = '    } else {\n      console.error([Generic] ? yt-dlp failed with code  for "");\n      // Notify webhook of failure so frontend can update status\n      if (webhookUrl && metadata) {\n        try {\n          await fetch(webhookUrl, {\n            method: \'POST\',\n            headers: { \'Content-Type\': \'application/json\' },\n            body: JSON.stringify({ secret: CALLBACK_SECRET, error: \'yt-dlp download failed\', metadata, libraryId: BUNNY_LIBRARY_ID })\n          });\n        } catch (e) {}\n      }\n    }\n  });\n}';

const n2 = '    } else {\n      if ((stderrLog.includes("This live event has ended") || stderrLog.includes("Premieres in") || stderrLog.includes("No video formats found") || stderrLog.includes("Requested format is not available")) && attempt < maxAttempts) {\n        console.log([Generic] ? YouTube is still processing the live stream. Waiting 5 minutes to retry...);\n        attempt++;\n        setTimeout(attemptDownload, 5 * 60 * 1000);\n      } else {\n        console.error([Generic] ? yt-dlp failed with code  for "");\n        if (webhookUrl && metadata) {\n          try {\n            await fetch(webhookUrl, {\n              method: \'POST\',\n              headers: { \'Content-Type\': \'application/json\' },\n              body: JSON.stringify({ secret: CALLBACK_SECRET, error: \'yt-dlp download failed\', metadata, libraryId: BUNNY_LIBRARY_ID })\n            });\n          } catch (e) {}\n        }\n      }\n    }\n  });\n  };\n  attemptDownload();\n}';

if (code.indexOf(p1) !== -1) {
    code = code.replace(p1, n1);
    code = code.replace(p2, n2);
    fs.writeFileSync('rtmp-server/server.js', code);
    console.log('PATCHED OK');
} else {
    console.log('NOT FOUND');
}
