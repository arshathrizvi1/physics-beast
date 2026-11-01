const ytdl = require('@distube/ytdl-core');

async function test() {
    try {
        console.log("Fetching info...");
        const info = await ytdl.getInfo('https://www.youtube.com/watch?v=N3FYUJLz5to');
        const format = ytdl.chooseFormat(info.formats, { quality: 'highest' });
        console.log("SUCCESS! URL:", format.url ? "Found" : "No URL");
    } catch(e) {
        console.error("FAIL:", e.message);
    }
}
test();
