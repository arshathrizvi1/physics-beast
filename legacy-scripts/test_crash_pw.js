const { chromium } = require('playwright');

(async () => {
  console.log("Launching Playwright...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE LOG ERROR:', msg.text());
    } else {
      console.log('PAGE LOG:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE EXCEPTION:', error.message, error.stack);
  });

  console.log("Navigating to local server...");
  try {
    await page.goto('http://localhost:3001/course/9EXDeYJ8DpgVRY5upjFj', { waitUntil: 'networkidle' });
    console.log("Page loaded.");
    await page.waitForTimeout(3000);
  } catch (e) {
    console.error("Navigation error:", e);
  }
  
  await browser.close();
})();
