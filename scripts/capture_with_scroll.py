import os
import time
from playwright.sync_api import sync_playwright

output_dir = r"e:\Projects\Brilliant Academy Website\poster_assets"
os.makedirs(output_dir, exist_ok=True)

def capture_with_scroll():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        
        # Desktop context
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=2
        )
        page = context.new_page()
        page.add_init_script("sessionStorage.setItem('hasSeenIntro', 'true');")
        
        print("Navigating...")
        page.goto("http://localhost:3000", wait_until="domcontentloaded", timeout=60000)
        time.sleep(3)
        
        # Smoothly scroll down incrementally so all whileInView animations trigger
        total_height = page.evaluate("document.body.scrollHeight")
        print(f"Total scroll height: {total_height}")
        
        step = 600
        for current_y in range(0, total_height, step):
            page.evaluate(f"window.scrollTo(0, {current_y});")
            time.sleep(0.6)
            
        # Scroll back to top
        page.evaluate("window.scrollTo(0, 0);")
        time.sleep(2)
        
        # Now take high-res full page screenshot with ALL animations rendered!
        full_path = os.path.join(output_dir, "full_landing_animated.png")
        page.screenshot(path=full_path, full_page=True)
        print(f"Saved full landing animated: {full_path}")
        
        # Capture discrete desktop sections
        # 1. Hero
        page.screenshot(path=os.path.join(output_dir, "desktop_hero_section.png"), clip={"x": 0, "y": 0, "width": 1440, "height": 780})
        
        # 2. Stats
        page.evaluate("window.scrollTo(0, 720);")
        time.sleep(1)
        page.screenshot(path=os.path.join(output_dir, "desktop_stats_section.png"), clip={"x": 0, "y": 700, "width": 1440, "height": 380})

        # 3. Courses
        page.evaluate("window.scrollTo(0, 1100);")
        time.sleep(1)
        page.screenshot(path=os.path.join(output_dir, "desktop_courses_section.png"), clip={"x": 0, "y": 1050, "width": 1440, "height": 550})

        # 4. App Mockup
        page.evaluate("window.scrollTo(0, 1600);")
        time.sleep(1)
        page.screenshot(path=os.path.join(output_dir, "desktop_app_section.png"), clip={"x": 0, "y": 1580, "width": 1440, "height": 750})
        
        # Also do mobile
        mobile_context = browser.new_context(
            viewport={"width": 412, "height": 892},
            device_scale_factor=3,
            is_mobile=True,
            user_agent="Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"
        )
        mobile_page = mobile_context.new_page()
        mobile_page.add_init_script("sessionStorage.setItem('hasSeenIntro', 'true');")
        mobile_page.goto("http://localhost:3000", wait_until="domcontentloaded", timeout=60000)
        time.sleep(2)
        
        mob_h = mobile_page.evaluate("document.body.scrollHeight")
        for my in range(0, mob_h, 500):
            mobile_page.evaluate(f"window.scrollTo(0, {my});")
            time.sleep(0.4)
            
        mobile_page.evaluate("window.scrollTo(0, 0);")
        time.sleep(1.5)
        
        mobile_page.screenshot(path=os.path.join(output_dir, "mobile_full_animated.png"), full_page=True)
        mobile_page.screenshot(path=os.path.join(output_dir, "mobile_hero_section.png"), clip={"x": 0, "y": 0, "width": 412, "height": 850})
        
        # Also let's capture the mobile phone card view in mobile
        mobile_page.evaluate("window.scrollTo(0, 1800);")
        time.sleep(1)
        mobile_page.screenshot(path=os.path.join(output_dir, "mobile_app_section.png"), clip={"x": 0, "y": 1750, "width": 412, "height": 700})
        
        browser.close()
        print("Captured with all animations active!")

if __name__ == "__main__":
    capture_with_scroll()
