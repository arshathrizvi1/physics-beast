import time
from playwright.sync_api import sync_playwright

def inspect():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        # Force dark mode
        context = browser.new_context(
            color_scheme="dark",
            viewport={"width": 1440, "height": 900},
            device_scale_factor=2
        )
        page = context.new_page()
        page.add_init_script("sessionStorage.setItem('hasSeenIntro', 'true');")
        page.goto("http://localhost:3000", wait_until="domcontentloaded")
        time.sleep(4)
        
        # Scroll to bottom and back
        page.evaluate("""
            window.scrollTo(0, document.body.scrollHeight);
        """)
        time.sleep(2)
        page.evaluate("window.scrollTo(0, 0);")
        time.sleep(1)
        
        html_class = page.evaluate("document.documentElement.className")
        headings = page.evaluate("[...document.querySelectorAll('h1, h2, h3, h4')].map(e => e.innerText)")
        course_cards = page.evaluate("[...document.querySelectorAll('a[href*=\"/course/\"]')].map(e => e.innerText.trim())")
        
        print("HTML class:", html_class)
        print("Headings:", headings)
        print("Course elements count:", len(course_cards))
        for c in course_cards[:5]:
            print("Course item:", repr(c[:50]))
            
        page.screenshot(path=r"e:\Projects\Brilliant Academy Website\poster_assets\dark_page_top.png", clip={"x": 0, "y": 0, "width": 1440, "height": 900})
        
        page.evaluate("window.scrollTo(0, 800);")
        time.sleep(1)
        page.screenshot(path=r"e:\Projects\Brilliant Academy Website\poster_assets\dark_page_mid1.png", clip={"x": 0, "y": 0, "width": 1440, "height": 900})

        page.evaluate("window.scrollTo(0, 1600);")
        time.sleep(1)
        page.screenshot(path=r"e:\Projects\Brilliant Academy Website\poster_assets\dark_page_mid2.png", clip={"x": 0, "y": 0, "width": 1440, "height": 900})

        browser.close()

if __name__ == "__main__":
    inspect()
