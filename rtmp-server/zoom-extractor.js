
const { chromium } = require("playwright");

const url = process.argv[2];
const password = process.argv[3] || "";

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    let mediaUrl = null;
    page.on("request", req => {
      const rUrl = req.url();
      if (rUrl.includes(".mp4") || rUrl.includes(".m3u8")) {
        if (!mediaUrl) mediaUrl = rUrl;
      }
    });

    await page.goto(url, { waitUntil: "networkidle" });
    
    if (password) {
      try {
        await page.waitForSelector("input[type=\"password\"]", { timeout: 5000 });
        await page.fill("input[type=\"password\"]", password);
        await page.keyboard.press("Enter");
        await page.waitForTimeout(3000);
      } catch (e) {
        // No password prompt, might not need one or timed out
      }
    }

    try {
      await page.waitForSelector("video", { timeout: 15000 });
      const videoSrc = await page.evaluate(() => document.querySelector("video").src);
      if (videoSrc) {
         mediaUrl = videoSrc;
      }
    } catch(e) {}

    if (mediaUrl) {
      console.log(mediaUrl);
      process.exit(0);
    } else {
      console.error("Could not extract video URL");
      process.exit(1);
    }
  } catch (error) {
    console.error("Extractor error:", error);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();

