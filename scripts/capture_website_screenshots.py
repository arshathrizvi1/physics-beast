import os
import time
from playwright.sync_api import sync_playwright

output_dir = r"e:\Projects\Brilliant Academy Website\poster_assets"
os.makedirs(output_dir, exist_ok=True)

def capture():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        
        # Desktop context
        context = browser.new_context(
            viewport={"width": 1440, "height": 1000},
            device_scale_factor=2
        )
        page = context.new_page()
        page.add_init_script("sessionStorage.setItem('hasSeenIntro', 'true');")
        
        print("Navigating to http://localhost:3000...")
        page.goto("http://localhost:3000", wait_until="domcontentloaded", timeout=60000)
        time.sleep(3)
        
        # 1. Full page screenshot first so we have the entire pristine canvas
        full_path = os.path.join(output_dir, "full_landing.png")
        page.screenshot(path=full_path, full_page=True)
        print(f"Saved full page: {full_path}")
        
        # 2. Get sections
        sections = page.locator("section").all()
        print(f"Found {len(sections)} sections")
        for idx, sec in enumerate(sections):
            try:
                sec.scroll_into_view_if_needed()
                time.sleep(1)
                sec_path = os.path.join(output_dir, f"section_{idx}.png")
                sec.screenshot(path=sec_path)
                print(f"Saved section {idx}: {sec_path}")
            except Exception as e:
                print(f"Section {idx} error: {e}")
                
        # 3. Mobile screen capture
        mobile_context = browser.new_context(
            viewport={"width": 430, "height": 932},
            device_scale_factor=3,
            is_mobile=True,
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        )
        mobile_page = mobile_context.new_page()
        mobile_page.add_init_script("sessionStorage.setItem('hasSeenIntro', 'true');")
        mobile_page.goto("http://localhost:3000", wait_until="domcontentloaded", timeout=60000)
        time.sleep(3)
        
        mob_full_path = os.path.join(output_dir, "mobile_full.png")
        mobile_page.screenshot(path=mob_full_path, full_page=True)
        print(f"Saved mobile full: {mob_full_path}")
        
        mob_hero_path = os.path.join(output_dir, "mobile_hero.png")
        mobile_page.screenshot(path=mob_hero_path, clip={"x": 0, "y": 0, "width": 430, "height": 850})
        print(f"Saved mobile hero: {mob_hero_path}")
        
        browser.close()
        print("Done capturing all assets!")

if __name__ == "__main__":
    capture()
