import os
import time
from playwright.sync_api import sync_playwright

output_dir = r"e:\Projects\Brilliant Academy Website\poster_assets"
os.makedirs(output_dir, exist_ok=True)

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        
        # 1. Desktop Dark Mode Context (1440x960, 2x scale)
        context = browser.new_context(
            viewport={"width": 1440, "height": 960},
            device_scale_factor=2,
            color_scheme="dark"
        )
        page = context.new_page()
        
        # Inject theme and bypass intro
        page.add_init_script("""
            localStorage.setItem('theme', 'dark');
            sessionStorage.setItem('hasSeenIntro', 'true');
            window.addEventListener('DOMContentLoaded', () => {
                document.documentElement.classList.add('dark');
                document.documentElement.classList.remove('light');
            });
        """)
        
        print("Navigating to homepage...")
        page.goto("http://localhost:3000", wait_until="domcontentloaded", timeout=60000)
        time.sleep(3)
        
        # Ensure dark class is applied
        page.evaluate("""
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
            localStorage.setItem('theme', 'dark');
        """)
        
        # Scroll down through all sections to fire Framer Motion animations
        h = page.evaluate("document.body.scrollHeight")
        print(f"Scroll height: {h}")
        for y in range(0, h, 400):
            page.evaluate(f"window.scrollTo(0, {y});")
            time.sleep(0.3)
            
        page.evaluate("window.scrollTo(0, 0);")
        time.sleep(1.5)
        
        # 1. Hero Section screenshot
        hero_file = os.path.join(output_dir, "shot_hero.png")
        page.screenshot(path=hero_file, clip={"x": 0, "y": 0, "width": 1440, "height": 820})
        print(f"Saved: {hero_file}")
        
        # 2. Stats Section
        stats_file = os.path.join(output_dir, "shot_stats.png")
        # Scroll to stats
        page.evaluate("""
            const stats = document.querySelector('section:has(.grid-cols-4)') || document.querySelectorAll('section')[2];
            if (stats) stats.scrollIntoView({ behavior: 'instant', block: 'center' });
        """)
        time.sleep(1)
        stats_loc = page.locator("section:has(.grid-cols-4)").first
        if stats_loc.count() > 0:
            stats_loc.screenshot(path=stats_file)
        else:
            page.screenshot(path=stats_file, clip={"x": 0, "y": 200, "width": 1440, "height": 400})
        print(f"Saved: {stats_file}")
        
        # 3. Courses Carousel Section
        courses_file = os.path.join(output_dir, "shot_courses.png")
        page.evaluate("""
            const h2 = [...document.querySelectorAll('h2')].find(e => e.innerText.includes('Popular Courses'));
            if (h2) h2.closest('section').scrollIntoView({ behavior: 'instant', block: 'start' });
        """)
        time.sleep(1.5)
        courses_loc = page.locator("section:has-text('Popular Courses')").first
        if courses_loc.count() > 0:
            courses_loc.screenshot(path=courses_file)
        else:
            page.screenshot(path=courses_file, clip={"x": 0, "y": 100, "width": 1440, "height": 600})
        print(f"Saved: {courses_file}")

        # 4. App Mockup Section (Why Choose Brilliant Academy)
        app_file = os.path.join(output_dir, "shot_app_mockup.png")
        app_loc = page.locator("section:has-text('Why Choose')").first
        if app_loc.count() > 0:
            app_loc.scroll_into_view_if_needed()
            time.sleep(1.5)
            app_loc.screenshot(path=app_file)
            print(f"Saved: {app_file}")

        # 5. Reviews Section
        reviews_file = os.path.join(output_dir, "shot_reviews.png")
        rev_loc = page.locator("section:has-text('What Our Students Say')").first
        if rev_loc.count() > 0:
            rev_loc.scroll_into_view_if_needed()
            time.sleep(1.5)
            rev_loc.screenshot(path=reviews_file)
            print(f"Saved: {reviews_file}")
        
        # 6. Mobile Flagship Mockup capture
        mobile_context = browser.new_context(
            viewport={"width": 412, "height": 915},
            device_scale_factor=3,
            color_scheme="dark",
            is_mobile=True,
            user_agent="Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"
        )
        mobile_page = mobile_context.new_page()
        mobile_page.add_init_script("""
            localStorage.setItem('theme', 'dark');
            sessionStorage.setItem('hasSeenIntro', 'true');
        """)
        mobile_page.goto("http://localhost:3000", wait_until="domcontentloaded", timeout=60000)
        time.sleep(2)
        mobile_page.evaluate("""
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
        """)
        
        # Scroll through mobile
        mh = mobile_page.evaluate("document.body.scrollHeight")
        for my in range(0, mh, 400):
            mobile_page.evaluate(f"window.scrollTo(0, {my});")
            time.sleep(0.2)
        mobile_page.evaluate("window.scrollTo(0, 0);")
        time.sleep(1)
        
        mob_hero_file = os.path.join(output_dir, "shot_mobile_hero.png")
        mobile_page.screenshot(path=mob_hero_file, clip={"x": 0, "y": 0, "width": 412, "height": 840})
        print(f"Saved: {mob_hero_file}")

        browser.close()
        print("All high quality screenshots captured successfully!")

if __name__ == "__main__":
    run()
