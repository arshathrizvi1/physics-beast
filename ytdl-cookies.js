const ytdl = require('@distube/ytdl-core');
const fs = require('fs');

async function test() {
    try {
        console.log("Loading cookies...");
        const cookieFile = fs.readFileSync('/opt/brilliant-academy-rtmp/cookies.txt', 'utf8');
        
        // Parse Netscape cookies
        const cookies = [];
        cookieFile.split('\n').forEach(line => {
            if (line.startsWith('#') || !line.trim()) return;
            const parts = line.split('\t');
            if (parts.length >= 7) {
                cookies.push({
                    domain: parts[0],
                    path: parts[2],
                    secure: parts[3] === 'TRUE',
                    expirationDate: parseInt(parts[4]),
                    name: parts[5],
                    value: parts[6].replace('\r', '')
                });
            }
        });
        
        const agent = ytdl.createAgent(cookies);
        
        console.log("Fetching info with cookies...");
        const info = await ytdl.getInfo('https://www.youtube.com/watch?v=N3FYUJLz5to', { agent });
        const format = ytdl.chooseFormat(info.formats, { quality: 'highest' });
        console.log("SUCCESS! URL:", format.url ? "Found" : "No URL");
    } catch(e) {
        console.error("FAIL:", e.message);
    }
}
test();
