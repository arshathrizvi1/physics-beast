const fs = require("fs");
const url = process.argv[2];
const password = process.argv[3] || "";

if (!url) {
  console.error("Usage: node zoom_extractor.js <URL> [PASSWORD]");
  process.exit(1);
}

(async () => {
  let playwright;
  try {
    playwright = require("playwright");
  } catch (e) {
    try {
      playwright = require("@playwright/test");
    } catch (err) {
      console.error("Playwright is not installed.");
      process.exit(1);
    }
  }

  let browser;
  try {
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
    const launchOptions = {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"]
    };

    if (fs.existsSync("/usr/bin/google-chrome")) {
      launchOptions.executablePath = "/usr/bin/google-chrome";
    }

    browser = await playwright.chromium.launch(launchOptions);
    const context = await browser.newContext({ userAgent });
    const page = await context.newPage();

    let mediaUrl = null;
    page.on("request", (req) => {
      const rUrl = req.url();
      if (rUrl.includes(".mp4") || rUrl.includes(".m3u8") || rUrl.includes("file?")) {
        if (!mediaUrl) mediaUrl = rUrl;
      }
    });

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    } catch (e) {}

    // Dismiss cookie prompt if present
    try {
      await page.waitForSelector("#onetrust-accept-btn-handler", { timeout: 3000 });
      await page.click("#onetrust-accept-btn-handler");
      await page.waitForTimeout(1000);
    } catch (e) {}

    // Handle password field if password is provided
    if (password) {
      try {
        await page.waitForSelector("input[type=\"password\"]", { timeout: 6000 });
        await page.fill("input[type=\"password\"]", password);
        await page.keyboard.press("Enter");
        await page.waitForTimeout(4000);
      } catch (e) {}
    }

    // Dismiss any "Agree" button
    try {
      await page.waitForSelector("button:has-text(\"Agree\")", { timeout: 2000 });
      await page.click("button:has-text(\"Agree\")");
    } catch (e) {}

    // Find video element
    try {
      await page.waitForSelector("video", { timeout: 15000 });
      const videoSrc = await page.evaluate(() => {
        const v = document.querySelector("video");
        return v ? v.src : null;
      });
      if (videoSrc && videoSrc.startsWith("http")) {
        mediaUrl = videoSrc;
      }
    } catch (e) {}

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
      console.error("Could not extract video URL from page.");
      process.exit(1);
    }
  } catch (error) {
    console.error("Extractor runtime error:", error);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
