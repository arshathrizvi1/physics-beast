const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching Puppeteer...");
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE LOG ERROR:', msg.text());
    } else {
      console.log('PAGE LOG:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE EXCEPTION:', error.message);
  });

  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url(), request.failure().errorText);
  });

  console.log("Navigating to local server...");
  try {
    await page.goto('http://localhost:3001/course/9EXDeYJ8DpgVRY5upjFj', { waitUntil: 'networkidle0' });
    console.log("Page loaded.");
    await page.waitForTimeout(2000);
  } catch (e) {
    console.error("Navigation error:", e);
  }
  
  await browser.close();
})();
