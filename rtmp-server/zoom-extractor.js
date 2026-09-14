
const { chromium } = require("playwright");
const url = process.argv[2];
const password = process.argv[3] || "";

(async () => {
  let browser;
  try {
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"] });
    const context = await browser.newContext({ userAgent });
    const page = await context.newPage();
    
    let mediaUrl = null;
    page.on("request", req => {
      const rUrl = req.url();
      if (rUrl.includes(".mp4") || rUrl.includes(".m3u8") || rUrl.includes("file?")) {
        if (!mediaUrl) mediaUrl = rUrl;
      }
    });

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    } catch(e) {}
    
    try {
      await page.waitForSelector("#onetrust-accept-btn-handler", { timeout: 3000 });
      await page.click("#onetrust-accept-btn-handler");
      await page.waitForTimeout(1000);
    } catch (e) { }

    if (password) {
      try {
        await page.waitForSelector("input[type=\"password\"]", { timeout: 5000 });
        await page.fill("input[type=\"password\"]", password);
        await page.keyboard.press("Enter");
        await page.waitForTimeout(3000);
      } catch (e) { }
    }

    try {
      await page.waitForSelector("button:has-text(\"Agree\")", { timeout: 2000 });
      await page.click("button:has-text(\"Agree\")");
    } catch(e) {}

    try {
      await page.waitForSelector("video", { timeout: 15000 });
      const videoSrc = await page.evaluate(() => document.querySelector("video").src);
      if (videoSrc && videoSrc.startsWith("http")) {
         mediaUrl = videoSrc;
      }
    } catch(e) {}

    if (mediaUrl) {
      const cookies = await context.cookies();
      const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join("; ");
      console.log(JSON.stringify({
         url: mediaUrl,
         cookies: cookieStr,
         userAgent: userAgent
      }));
      process.exit(0);
    } else {
      console.error("Could not extract video URL.");
      process.exit(1);
    }
  } catch (error) {
    console.error("Extractor error:", error);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();

