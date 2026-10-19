import os
import shutil
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ARTIFACT_DIR = r"C:\Users\arshad\.gemini\antigravity\brain\1369b147-69f6-454e-930a-3ba333b3f52b"
PROJECT_DIR = r"e:\Projects\Brilliant Academy Website"
ASSETS_DIR = os.path.join(PROJECT_DIR, "poster_assets")

def create_rounded_mask(size, radius):
    mask = Image.new('L', size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask

def add_drop_shadow(image, offset=(0, 15), shadow_color=(0, 0, 0, 190), blur_radius=25):
    pad = blur_radius * 2
    w, h = image.size
    canvas_w = w + pad * 2
    canvas_h = h + pad * 2
    
    shadow = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sx0 = pad + offset[0]
    sy0 = pad + offset[1]
    sdraw.rectangle((sx0, sy0, sx0 + w, sy0 + h), fill=shadow_color)
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur_radius))
    shadow.paste(image, (pad, pad), image if image.mode == 'RGBA' else None)
    return shadow, pad

def make_browser_mockup(screen_img, width, height, title="brilliantacademy.lk"):
    hdr_h = 36
    canvas = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    
    draw.rounded_rectangle((0, 0, width, height), radius=16, fill=(18, 18, 22, 255), outline=(212, 175, 55, 100), width=2)
    draw.rounded_rectangle((0, 0, width, hdr_h), radius=16, fill=(28, 28, 34, 255))
    draw.rectangle((0, 16, width, hdr_h), fill=(28, 28, 34, 255))
    
    draw.ellipse((14, 12, 24, 22), fill=(255, 95, 87, 255))
    draw.ellipse((32, 12, 42, 22), fill=(254, 188, 46, 255))
    draw.ellipse((50, 12, 60, 22), fill=(40, 201, 64, 255))
    
    pill_w = 260
    pill_x = (width - pill_w) // 2
    draw.rounded_rectangle((pill_x, 8, pill_x + pill_w, 28), radius=10, fill=(14, 14, 18, 255), outline=(255, 255, 255, 30), width=1)
    
    try:
        font_pill = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 11)
    except:
        font_pill = ImageFont.load_default()
    draw.text((pill_x + 30, 11), f"🔒  https://{title}", font=font_pill, fill=(160, 160, 170, 255))
    
    screen_h = height - hdr_h
    resized_screen = screen_img.resize((width - 4, screen_h - 4), Image.Resampling.LANCZOS)
    canvas.paste(resized_screen, (2, hdr_h), resized_screen if resized_screen.mode == 'RGBA' else None)
    draw.rounded_rectangle((0, 0, width, height), radius=16, fill=None, outline=(212, 175, 55, 120), width=2)
    return canvas

# ==========================================================
# 1. PORTRAIT POSTER (1080 x 1350 px) - 4:5 Feed Post
# ==========================================================
def build_portrait_poster():
    W, H = 1080, 1350
    poster = Image.new('RGBA', (W, H), (10, 10, 14, 255))
    draw = ImageDraw.Draw(poster)
    
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse((-150, -150, 500, 500), fill=(212, 175, 55, 45))
    gdraw.ellipse((W - 450, H - 450, W + 150, H + 150), fill=(212, 175, 55, 40))
    gdraw.ellipse((W//2 - 350, 400, W//2 + 350, 1000), fill=(212, 175, 55, 25))
    glow = glow.filter(ImageFilter.GaussianBlur(120))
    poster = Image.alpha_composite(poster, glow)
    draw = ImageDraw.Draw(poster)
    
    draw.line([(0, 0), (W, 0)], fill=(212, 175, 55, 200), width=4)
    draw.line([(0, H - 1), (W, H - 1)], fill=(212, 175, 55, 200), width=4)
    
    font_bold = "C:/Windows/Fonts/bahnschrift.ttf"
    font_segoe_b = "C:/Windows/Fonts/segoeuib.ttf"
    font_segoe = "C:/Windows/Fonts/segoeui.ttf"
    
    f_brand = ImageFont.truetype(font_bold, 28)
    f_badge = ImageFont.truetype(font_segoe_b, 13)
    f_tagline = ImageFont.truetype(font_segoe, 13)
    f_h1 = ImageFont.truetype(font_bold, 44)
    f_h1_sub = ImageFont.truetype(font_segoe, 18)
    f_stat_num = ImageFont.truetype(font_bold, 26)
    f_stat_label = ImageFont.truetype(font_segoe_b, 12)
    f_btn = ImageFont.truetype(font_bold, 20)
    f_url = ImageFont.truetype(font_segoe_b, 14)
    
    # Logo
    logo_path = os.path.join(PROJECT_DIR, "public", "logo.jpg")
    if os.path.exists(logo_path):
        logo_im = Image.open(logo_path).convert('RGBA')
        logo_size = 70
        logo_im = logo_im.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
        logo_mask = Image.new('L', (logo_size, logo_size), 0)
        ldraw = ImageDraw.Draw(logo_mask)
        ldraw.ellipse((0, 0, logo_size, logo_size), fill=255)
        draw.ellipse((46, 36, 46 + logo_size + 8, 36 + logo_size + 8), fill=(212, 175, 55, 60), outline=(212, 175, 55, 220), width=2)
        poster.paste(logo_im, (50, 40), logo_mask)
    
    draw.text((135, 42), "BRILLIANT", font=f_brand, fill=(255, 255, 255, 255))
    draw.text((275, 42), "ACADEMY", font=f_brand, fill=(212, 175, 55, 255))
    draw.text((137, 78), "EXCELLENCE IN DIGITAL EDUCATION", font=f_tagline, fill=(180, 180, 190, 255))
    
    pill_text = "★ 5.0 TOP RATED ACADEMY"
    pill_w = 210
    pill_h = 36
    pill_x = W - pill_w - 50
    pill_y = 50
    draw.rounded_rectangle((pill_x, pill_y, pill_x + pill_w, pill_y + pill_h), radius=18, fill=(212, 175, 55, 25), outline=(212, 175, 55, 120), width=1)
    draw.text((pill_x + 18, pill_y + 9), pill_text, font=f_badge, fill=(245, 215, 110, 255))
    
    # Tag
    tag_text = "🎓 ADMISSIONS NOW OPEN • ADVANCED LEVEL & BEYOND"
    tag_w = 420
    tag_h = 32
    draw.rounded_rectangle((50, 135, 50 + tag_w, 135 + tag_h), radius=16, fill=(25, 25, 32, 220), outline=(212, 175, 55, 80), width=1)
    draw.text((68, 142), tag_text, font=f_badge, fill=(212, 175, 55, 255))
    
    # Title
    draw.text((50, 180), "Your", font=f_h1, fill=(255, 255, 255, 255))
    draw.text((160, 180), "Brighter Future", font=f_h1, fill=(235, 195, 75, 255))
    draw.text((495, 180), "Starts Here.", font=f_h1, fill=(255, 255, 255, 255))
    
    subtext = "Learn from premier instructors with full HD video lessons, real-time testing,"
    subtext2 = "smart progress analytics & our interactive Android LMS mobile app."
    draw.text((50, 235), subtext, font=f_h1_sub, fill=(190, 190, 205, 255))
    draw.text((50, 260), subtext2, font=f_h1_sub, fill=(190, 190, 205, 255))
    
    # Showcase Browser + Phone
    hero_shot_path = os.path.join(ASSETS_DIR, "shot_hero.png")
    if os.path.exists(hero_shot_path):
        raw_screen = Image.open(hero_shot_path)
        sc_w, sc_h = raw_screen.size
        cropped_hero = raw_screen.crop((0, int(sc_h * 0.12), sc_w, int(sc_h * 0.98)))
        browser_w, browser_h = 780, 490
        browser_img = make_browser_mockup(cropped_hero, browser_w, browser_h, title="brilliantacademy.lk")
        shadowed_browser, pad = add_drop_shadow(browser_img, offset=(0, 20), shadow_color=(0, 0, 0, 220), blur_radius=30)
        poster.paste(shadowed_browser, (50 - pad, 305 - pad), shadowed_browser)
    
    phone_shot_path = os.path.join(ASSETS_DIR, "phone_mockup_crop.png")
    if os.path.exists(phone_shot_path):
        phone_img = Image.open(phone_shot_path).convert('RGBA')
        target_phone_h = 540
        aspect = phone_img.width / phone_img.height
        target_phone_w = int(target_phone_h * aspect)
        phone_resized = phone_img.resize((target_phone_w, target_phone_h), Image.Resampling.LANCZOS)
        shadowed_phone, ppad = add_drop_shadow(phone_resized, offset=(-5, 20), shadow_color=(0, 0, 0, 240), blur_radius=35)
        poster.paste(shadowed_phone, (W - target_phone_w - 40 - ppad, 350 - ppad), shadowed_phone)
    
    # Feature Badges
    b_canvas = Image.new('RGBA', (240, 54), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(b_canvas)
    bdraw.rounded_rectangle((0, 0, 240, 54), radius=16, fill=(18, 18, 24, 245), outline=(212, 175, 55, 160), width=1)
    bdraw.text((16, 10), "⚡ ZERO LAG HD VIDEO", font=ImageFont.truetype(font_segoe_b, 12), fill=(212, 175, 55, 255))
    bdraw.text((16, 28), "Pinch-Zoom PDFs & Smart Notes", font=ImageFont.truetype(font_segoe, 11), fill=(220, 220, 230, 255))
    sb1, bpad = add_drop_shadow(b_canvas, offset=(0, 8), blur_radius=15)
    poster.paste(sb1, (70 - bpad, 755 - bpad), sb1)
    
    b2_canvas = Image.new('RGBA', (240, 54), (0, 0, 0, 0))
    b2draw = ImageDraw.Draw(b2_canvas)
    b2draw.rounded_rectangle((0, 0, 240, 54), radius=16, fill=(18, 18, 24, 245), outline=(52, 211, 153, 160), width=1)
    b2draw.text((16, 10), "📱 ANDROID APP APK", font=ImageFont.truetype(font_segoe_b, 12), fill=(52, 211, 153, 255))
    b2draw.text((16, 28), "Offline Downloads & Real-time Live", font=ImageFont.truetype(font_segoe, 11), fill=(220, 220, 230, 255))
    sb2, b2pad = add_drop_shadow(b2_canvas, offset=(0, 8), blur_radius=15)
    poster.paste(sb2, (330 - b2pad, 755 - b2pad), sb2)
    
    draw = ImageDraw.Draw(poster)
    
    # Stats
    stat_y = 860
    card_w, card_h = 230, 100
    gap = 20
    start_x = 50
    stats = [
        {"num": "2,000+", "label": "ACTIVE STUDENTS"},
        {"num": "50+", "label": "SPECIALIZED COURSES"},
        {"num": "4.8 / 5.0", "label": "STUDENT RATING"},
        {"num": "30+", "label": "EXPERT INSTRUCTORS"}
    ]
    for i, s in enumerate(stats):
        cx = start_x + i * (card_w + gap)
        draw.rounded_rectangle((cx, stat_y, cx + card_w, stat_y + card_h), radius=16, fill=(18, 18, 24, 230), outline=(212, 175, 55, 70), width=1)
        draw.line([(cx + 16, stat_y + 1), (cx + card_w - 16, stat_y + 1)], fill=(212, 175, 55, 120), width=1)
        draw.text((cx + 20, stat_y + 18), s["num"], font=f_stat_num, fill=(245, 215, 110, 255))
        draw.text((cx + 20, stat_y + 58), s["label"], font=f_stat_label, fill=(170, 170, 185, 255))
    
    # Courses Strip
    pop_y = 990
    draw.text((50, pop_y), "TOP IN-DEMAND MASTERCLASSES", font=ImageFont.truetype(font_segoe_b, 14), fill=(212, 175, 55, 255))
    courses_chips = [
        "🔬 Advanced Level Physics 2026",
        "📐 Combined Mathematics Masterclass",
        "⚗️ Chemistry Theory & Revision",
        "💻 ICT Practical Projects"
    ]
    chip_x = 50
    chip_y = pop_y + 26
    for chip in courses_chips:
        c_font = ImageFont.truetype(font_segoe, 13)
        bbox = draw.textbbox((0, 0), chip, font=c_font)
        cw = bbox[2] - bbox[0] + 28
        draw.rounded_rectangle((chip_x, chip_y, chip_x + cw, chip_y + 34), radius=17, fill=(24, 24, 30, 220), outline=(255, 255, 255, 25), width=1)
        draw.text((chip_x + 14, chip_y + 8), chip, font=c_font, fill=(230, 230, 240, 255))
        chip_x += cw + 12
    
    # CTA Banner
    cta_y = 1085
    cta_w, cta_h = W - 100, 195
    cta_canvas = Image.new('RGBA', (cta_w, cta_h), (0, 0, 0, 0))
    cdraw = ImageDraw.Draw(cta_canvas)
    cdraw.rounded_rectangle((0, 0, cta_w, cta_h), radius=24, fill=(16, 16, 22, 255), outline=(212, 175, 55, 140), width=2)
    cdraw.rounded_rectangle((2, 2, cta_w - 2, 60), radius=24, fill=(212, 175, 55, 15))
    cdraw.text((36, 32), "Ready to Transform Your Learning?", font=ImageFont.truetype(font_bold, 24), fill=(255, 255, 255, 255))
    cdraw.text((36, 68), "Join thousands of successful students studying with Brilliant Academy today.", font=ImageFont.truetype(font_segoe, 14), fill=(180, 180, 195, 255))
    cdraw.text((36, 110), "✓ Flexible Timing   ✓ Paper Marking   ✓ Doubt Support   ✓ Complete LMS", font=ImageFont.truetype(font_segoe_b, 13), fill=(212, 175, 55, 255))
    
    btn_w, btn_h = 290, 56
    btn_x = cta_w - btn_w - 36
    btn_y = 38
    cdraw.rounded_rectangle((btn_x, btn_y, btn_x + btn_w, btn_y + btn_h), radius=28, fill=(212, 175, 55, 255), outline=(245, 225, 140, 255), width=2)
    btn_title = "ENROLL TODAY  ➔"
    t_box = cdraw.textbbox((0, 0), btn_title, font=f_btn)
    tw = t_box[2] - t_box[0]
    cdraw.text((btn_x + (btn_w - tw)//2, btn_y + 14), btn_title, font=f_btn, fill=(10, 10, 12, 255))
    
    link_text = "🌐  www.brilliantacademy.lk"
    l_box = cdraw.textbbox((0, 0), link_text, font=f_url)
    lw = l_box[2] - l_box[0]
    cdraw.text((btn_x + (btn_w - lw)//2, btn_y + 70), link_text, font=f_url, fill=(245, 215, 110, 255))
    
    apk_text = "📲  Download Official Android APK"
    a_box = cdraw.textbbox((0, 0), apk_text, font=ImageFont.truetype(font_segoe, 12))
    aw = a_box[2] - a_box[0]
    cdraw.text((btn_x + (btn_w - aw)//2, btn_y + 100), apk_text, font=ImageFont.truetype(font_segoe, 12), fill=(160, 160, 175, 255))
    
    scta, cpad = add_drop_shadow(cta_canvas, offset=(0, 10), shadow_color=(0, 0, 0, 180), blur_radius=25)
    poster.paste(scta, (50 - cpad, cta_y - cpad), scta)
    
    final_poster = Image.new('RGB', (W, H), (10, 10, 14))
    final_poster.paste(poster, (0, 0), poster)
    
    p1 = os.path.join(PROJECT_DIR, "instagram_poster_portrait.png")
    p2 = os.path.join(ARTIFACT_DIR, "instagram_poster_portrait.png")
    final_poster.save(p1, quality=95)
    final_poster.save(p2, quality=95)
    print("Saved portrait poster:", p1)
    return final_poster

# ==========================================================
# 2. SQUARE POSTER (1080 x 1080 px) - 1:1 Feed Post
# ==========================================================
def build_square_poster():
    W, H = 1080, 1080
    poster = Image.new('RGBA', (W, H), (10, 10, 14, 255))
    draw = ImageDraw.Draw(poster)
    
    # Glows
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse((-100, -100, 450, 450), fill=(212, 175, 55, 45))
    gdraw.ellipse((W - 400, H - 400, W + 100, H + 100), fill=(212, 175, 55, 40))
    glow = glow.filter(ImageFilter.GaussianBlur(100))
    poster = Image.alpha_composite(poster, glow)
    draw = ImageDraw.Draw(poster)
    
    draw.line([(0, 0), (W, 0)], fill=(212, 175, 55, 200), width=4)
    draw.line([(0, H - 1), (W, H - 1)], fill=(212, 175, 55, 200), width=4)
    
    font_bold = "C:/Windows/Fonts/bahnschrift.ttf"
    font_segoe_b = "C:/Windows/Fonts/segoeuib.ttf"
    font_segoe = "C:/Windows/Fonts/segoeui.ttf"
    
    # Logo
    logo_path = os.path.join(PROJECT_DIR, "public", "logo.jpg")
    if os.path.exists(logo_path):
        logo_im = Image.open(logo_path).convert('RGBA').resize((60, 60), Image.Resampling.LANCZOS)
        logo_mask = Image.new('L', (60, 60), 0)
        ldraw = ImageDraw.Draw(logo_mask)
        ldraw.ellipse((0, 0, 60, 60), fill=255)
        draw.ellipse((36, 26, 36 + 68, 26 + 68), fill=(212, 175, 55, 60), outline=(212, 175, 55, 220), width=2)
        poster.paste(logo_im, (40, 30), logo_mask)
        
    draw.text((115, 32), "BRILLIANT", font=ImageFont.truetype(font_bold, 24), fill=(255, 255, 255, 255))
    draw.text((235, 32), "ACADEMY", font=ImageFont.truetype(font_bold, 24), fill=(212, 175, 55, 255))
    draw.text((117, 62), "EXCELLENCE IN DIGITAL EDUCATION", font=ImageFont.truetype(font_segoe, 11), fill=(180, 180, 190, 255))
    
    # Top Right Pill
    pill_text = "★ 5.0 TOP RATED LMS"
    pill_w = 180
    pill_h = 32
    pill_x = W - pill_w - 40
    pill_y = 38
    draw.rounded_rectangle((pill_x, pill_y, pill_x + pill_w, pill_y + pill_h), radius=16, fill=(212, 175, 55, 25), outline=(212, 175, 55, 120), width=1)
    draw.text((pill_x + 16, pill_y + 8), pill_text, font=ImageFont.truetype(font_segoe_b, 11), fill=(245, 215, 110, 255))
    
    # Headline
    draw.text((40, 110), "Your", font=ImageFont.truetype(font_bold, 36), fill=(255, 255, 255, 255))
    draw.text((130, 110), "Brighter Future", font=ImageFont.truetype(font_bold, 36), fill=(235, 195, 75, 255))
    draw.text((400, 110), "Starts Here.", font=ImageFont.truetype(font_bold, 36), fill=(255, 255, 255, 255))
    
    draw.text((40, 155), "Sri Lanka's leading e-learning platform with HD live classes & interactive Android LMS app.", font=ImageFont.truetype(font_segoe, 15), fill=(180, 180, 195, 255))
    
    # Device Showcase
    hero_shot_path = os.path.join(ASSETS_DIR, "shot_hero.png")
    if os.path.exists(hero_shot_path):
        raw_screen = Image.open(hero_shot_path)
        sc_w, sc_h = raw_screen.size
        cropped_hero = raw_screen.crop((0, int(sc_h * 0.12), sc_w, int(sc_h * 0.98)))
        browser_w, browser_h = 680, 420
        browser_img = make_browser_mockup(cropped_hero, browser_w, browser_h)
        shadowed_browser, pad = add_drop_shadow(browser_img, offset=(0, 18), shadow_color=(0, 0, 0, 220), blur_radius=25)
        poster.paste(shadowed_browser, (40 - pad, 195 - pad), shadowed_browser)
    
    phone_shot_path = os.path.join(ASSETS_DIR, "phone_mockup_crop.png")
    if os.path.exists(phone_shot_path):
        phone_img = Image.open(phone_shot_path).convert('RGBA')
        target_phone_h = 460
        aspect = phone_img.width / phone_img.height
        target_phone_w = int(target_phone_h * aspect)
        phone_resized = phone_img.resize((target_phone_w, target_phone_h), Image.Resampling.LANCZOS)
        shadowed_phone, ppad = add_drop_shadow(phone_resized, offset=(-5, 18), shadow_color=(0, 0, 0, 240), blur_radius=30)
        poster.paste(shadowed_phone, (W - target_phone_w - 30 - ppad, 230 - ppad), shadowed_phone)
        
    draw = ImageDraw.Draw(poster)
    
    # 4 Stat Chips
    stat_y = 665
    card_w, card_h = 235, 75
    gap = 20
    start_x = 40
    stats = [
        {"num": "2,000+", "label": "ACTIVE STUDENTS"},
        {"num": "50+", "label": "SPECIALIZED COURSES"},
        {"num": "4.8 / 5.0", "label": "STUDENT RATING"},
        {"num": "ZERO LAG", "label": "HD VIDEO LESSONS"}
    ]
    for i, s in enumerate(stats):
        cx = start_x + i * (card_w + gap)
        draw.rounded_rectangle((cx, stat_y, cx + card_w, stat_y + card_h), radius=14, fill=(18, 18, 24, 230), outline=(212, 175, 55, 70), width=1)
        draw.text((cx + 16, stat_y + 12), s["num"], font=ImageFont.truetype(font_bold, 22), fill=(245, 215, 110, 255))
        draw.text((cx + 16, stat_y + 44), s["label"], font=ImageFont.truetype(font_segoe_b, 10), fill=(160, 160, 175, 255))
        
    # Popular Courses chips
    pop_y = 760
    draw.text((40, pop_y), "POPULAR COURSES:  🔬 A/L Physics 2026   📐 Combined Maths   ⚗️ Chemistry Revision   💻 ICT Practical", font=ImageFont.truetype(font_segoe, 13), fill=(212, 175, 55, 255))
    
    # Bottom CTA Box
    cta_y = 805
    cta_w, cta_h = W - 80, 225
    cta_canvas = Image.new('RGBA', (cta_w, cta_h), (0, 0, 0, 0))
    cdraw = ImageDraw.Draw(cta_canvas)
    cdraw.rounded_rectangle((0, 0, cta_w, cta_h), radius=22, fill=(16, 16, 22, 255), outline=(212, 175, 55, 140), width=2)
    cdraw.rounded_rectangle((2, 2, cta_w - 2, 50), radius=22, fill=(212, 175, 55, 15))
    
    cdraw.text((32, 26), "Start Your Learning Journey Today", font=ImageFont.truetype(font_bold, 24), fill=(255, 255, 255, 255))
    cdraw.text((32, 62), "Enroll online to get instant access to live lectures, paper marking, and revision notes.", font=ImageFont.truetype(font_segoe, 14), fill=(180, 180, 195, 255))
    cdraw.text((32, 98), "✓ Expert Tutors  ✓ Instant Doubt Support  ✓ Android APK Available", font=ImageFont.truetype(font_segoe_b, 13), fill=(212, 175, 55, 255))
    
    # Button
    btn_w, btn_h = 280, 52
    btn_x = cta_w - btn_w - 32
    btn_y = 30
    cdraw.rounded_rectangle((btn_x, btn_y, btn_x + btn_w, btn_y + btn_h), radius=26, fill=(212, 175, 55, 255), outline=(245, 225, 140, 255), width=2)
    btn_title = "ENROLL NOW  ➔"
    t_box = cdraw.textbbox((0, 0), btn_title, font=ImageFont.truetype(font_bold, 18))
    tw = t_box[2] - t_box[0]
    cdraw.text((btn_x + (btn_w - tw)//2, btn_y + 14), btn_title, font=ImageFont.truetype(font_bold, 18), fill=(10, 10, 12, 255))
    
    cdraw.text((btn_x + 40, btn_y + 65), "🌐  www.brilliantacademy.lk", font=ImageFont.truetype(font_segoe_b, 14), fill=(245, 215, 110, 255))
    cdraw.text((btn_x + 30, btn_y + 92), "📲  Download Official App APK", font=ImageFont.truetype(font_segoe, 12), fill=(160, 160, 175, 255))
    
    # Brand footer bar inside CTA
    cdraw.line([(32, 145), (cta_w - 32, 145)], fill=(255, 255, 255, 20), width=1)
    cdraw.text((32, 165), "BRILLIANT ACADEMY  |  #1 Online Learning Platform for Advanced Level", font=ImageFont.truetype(font_segoe_b, 13), fill=(180, 180, 190, 255))
    cdraw.text((cta_w - 220, 165), "📸  @brilliantacademy", font=ImageFont.truetype(font_segoe_b, 13), fill=(212, 175, 55, 255))
    
    scta, cpad = add_drop_shadow(cta_canvas, offset=(0, 10), shadow_color=(0, 0, 0, 180), blur_radius=20)
    poster.paste(scta, (40 - cpad, cta_y - cpad), scta)
    
    final_square = Image.new('RGB', (W, H), (10, 10, 14))
    final_square.paste(poster, (0, 0), poster)
    
    p1 = os.path.join(PROJECT_DIR, "instagram_poster_square.png")
    p2 = os.path.join(ARTIFACT_DIR, "instagram_poster_square.png")
    final_square.save(p1, quality=95)
    final_square.save(p2, quality=95)
    print("Saved square poster:", p1)
    return final_square

# ==========================================================
# 3. STORY / REEL POSTER (1080 x 1920 px) - 9:16 Vertical
# ==========================================================
def build_story_poster():
    W, H = 1080, 1920
    poster = Image.new('RGBA', (W, H), (10, 10, 14, 255))
    draw = ImageDraw.Draw(poster)
    
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse((-150, -150, 600, 600), fill=(212, 175, 55, 45))
    gdraw.ellipse((W - 500, H - 600, W + 200, H + 100), fill=(212, 175, 55, 40))
    gdraw.ellipse((W//2 - 300, 700, W//2 + 300, 1300), fill=(212, 175, 55, 30))
    glow = glow.filter(ImageFilter.GaussianBlur(130))
    poster = Image.alpha_composite(poster, glow)
    draw = ImageDraw.Draw(poster)
    
    draw.line([(0, 0), (W, 0)], fill=(212, 175, 55, 200), width=4)
    draw.line([(0, H - 1), (W, H - 1)], fill=(212, 175, 55, 200), width=4)
    
    font_bold = "C:/Windows/Fonts/bahnschrift.ttf"
    font_segoe_b = "C:/Windows/Fonts/segoeuib.ttf"
    font_segoe = "C:/Windows/Fonts/segoeui.ttf"
    
    # Header
    logo_path = os.path.join(PROJECT_DIR, "public", "logo.jpg")
    if os.path.exists(logo_path):
        logo_im = Image.open(logo_path).convert('RGBA').resize((75, 75), Image.Resampling.LANCZOS)
        logo_mask = Image.new('L', (75, 75), 0)
        ldraw = ImageDraw.Draw(logo_mask)
        ldraw.ellipse((0, 0, 75, 75), fill=255)
        draw.ellipse((46, 76, 46 + 83, 76 + 83), fill=(212, 175, 55, 60), outline=(212, 175, 55, 220), width=2)
        poster.paste(logo_im, (50, 80), logo_mask)
        
    draw.text((145, 84), "BRILLIANT", font=ImageFont.truetype(font_bold, 30), fill=(255, 255, 255, 255))
    draw.text((295, 84), "ACADEMY", font=ImageFont.truetype(font_bold, 30), fill=(212, 175, 55, 255))
    draw.text((147, 122), "SRI LANKA'S PREMIER DIGITAL LMS", font=ImageFont.truetype(font_segoe, 14), fill=(180, 180, 190, 255))
    
    # Top Right Pill
    pill_text = "★ 5.0 RATED"
    pill_w = 150
    pill_h = 36
    pill_x = W - pill_w - 50
    pill_y = 96
    draw.rounded_rectangle((pill_x, pill_y, pill_x + pill_w, pill_y + pill_h), radius=18, fill=(212, 175, 55, 25), outline=(212, 175, 55, 120), width=1)
    draw.text((pill_x + 20, pill_y + 9), pill_text, font=ImageFont.truetype(font_segoe_b, 13), fill=(245, 215, 110, 255))
    
    # Admission Tag
    draw.rounded_rectangle((50, 185, 480, 222), radius=18, fill=(25, 25, 32, 220), outline=(212, 175, 55, 80), width=1)
    draw.text((70, 194), "🎓 ADMISSIONS NOW OPEN • 2026 / 2027 A/L", font=ImageFont.truetype(font_segoe_b, 13), fill=(212, 175, 55, 255))
    
    # Headline
    draw.text((50, 240), "Your Brighter Future", font=ImageFont.truetype(font_bold, 48), fill=(235, 195, 75, 255))
    draw.text((50, 295), "Starts Right Here.", font=ImageFont.truetype(font_bold, 48), fill=(255, 255, 255, 255))
    
    draw.text((50, 360), "Experience the revolutionary digital learning academy designed for exam victory.", font=ImageFont.truetype(font_segoe, 18), fill=(190, 190, 205, 255))
    
    # Web Mockup
    hero_shot_path = os.path.join(ASSETS_DIR, "shot_hero.png")
    if os.path.exists(hero_shot_path):
        raw_screen = Image.open(hero_shot_path)
        sc_w, sc_h = raw_screen.size
        cropped_hero = raw_screen.crop((0, int(sc_h * 0.12), sc_w, int(sc_h * 0.98)))
        browser_w, browser_h = 760, 480
        browser_img = make_browser_mockup(cropped_hero, browser_w, browser_h)
        shadowed_browser, pad = add_drop_shadow(browser_img, offset=(0, 20), shadow_color=(0, 0, 0, 220), blur_radius=30)
        poster.paste(shadowed_browser, (50 - pad, 410 - pad), shadowed_browser)
        
    # Phone Mockup
    phone_shot_path = os.path.join(ASSETS_DIR, "phone_mockup_crop.png")
    if os.path.exists(phone_shot_path):
        phone_img = Image.open(phone_shot_path).convert('RGBA')
        target_phone_h = 580
        aspect = phone_img.width / phone_img.height
        target_phone_w = int(target_phone_h * aspect)
        phone_resized = phone_img.resize((target_phone_w, target_phone_h), Image.Resampling.LANCZOS)
        shadowed_phone, ppad = add_drop_shadow(phone_resized, offset=(-5, 20), shadow_color=(0, 0, 0, 240), blur_radius=35)
        poster.paste(shadowed_phone, (W - target_phone_w - 40 - ppad, 480 - ppad), shadowed_phone)
        
    draw = ImageDraw.Draw(poster)
    
    # Badges
    b_canvas = Image.new('RGBA', (260, 56), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(b_canvas)
    bdraw.rounded_rectangle((0, 0, 260, 56), radius=16, fill=(18, 18, 24, 245), outline=(212, 175, 55, 160), width=1)
    bdraw.text((16, 10), "⚡ ZERO-LAG HD STREAMING", font=ImageFont.truetype(font_segoe_b, 13), fill=(212, 175, 55, 255))
    bdraw.text((16, 30), "Pinch-Zoom PDFs & Smart Notes", font=ImageFont.truetype(font_segoe, 12), fill=(220, 220, 230, 255))
    sb1, bpad = add_drop_shadow(b_canvas, offset=(0, 8), blur_radius=15)
    poster.paste(sb1, (65 - bpad, 915 - bpad), sb1)
    
    # 4 Big Stat Cards (2x2 Grid)
    stat_y = 1000
    card_w = (W - 100 - 20) // 2
    card_h = 110
    stats = [
        {"num": "2,000+", "label": "ACTIVE STUDENTS ENROLLED"},
        {"num": "50+", "label": "SPECIALIZED MASTERCLASSES"},
        {"num": "4.8 / 5.0", "label": "AVERAGE STUDENT RATING"},
        {"num": "100% HD", "label": "UNLIMITED VIDEO REVISIONS"}
    ]
    for i, s in enumerate(stats):
        col = i % 2
        row = i // 2
        cx = 50 + col * (card_w + 20)
        cy = stat_y + row * (card_h + 20)
        draw.rounded_rectangle((cx, cy, cx + card_w, cy + card_h), radius=18, fill=(18, 18, 24, 230), outline=(212, 175, 55, 80), width=1)
        draw.text((cx + 24, cy + 22), s["num"], font=ImageFont.truetype(font_bold, 30), fill=(245, 215, 110, 255))
        draw.text((cx + 24, cy + 68), s["label"], font=ImageFont.truetype(font_segoe_b, 12), fill=(160, 160, 175, 255))
        
    # Popular Courses Box
    cbox_y = 1270
    draw.text((50, cbox_y), "POPULAR 2026/2027 A/L SUBJECTS", font=ImageFont.truetype(font_segoe_b, 15), fill=(212, 175, 55, 255))
    courses_chips = [
        ("🔬 Advanced Level Physics 2026", "Theory & Paper Class"),
        ("📐 Combined Mathematics Masterclass", "Pure & Applied Maths"),
        ("⚗️ Chemistry Theory & Revision", "Mechanisms & Calculations"),
        ("💻 Information & Comm. Technology", "Python & Practicals")
    ]
    ch_y = cbox_y + 35
    for title, subtitle in courses_chips:
        draw.rounded_rectangle((50, ch_y, W - 50, ch_y + 60), radius=16, fill=(20, 20, 26, 220), outline=(255, 255, 255, 25), width=1)
        draw.text((70, ch_y + 12), title, font=ImageFont.truetype(font_segoe_b, 15), fill=(255, 255, 255, 255))
        draw.text((70, ch_y + 34), subtitle, font=ImageFont.truetype(font_segoe, 13), fill=(170, 170, 185, 255))
        draw.text((W - 160, ch_y + 20), "ENROLL ➔", font=ImageFont.truetype(font_segoe_b, 13), fill=(212, 175, 55, 255))
        ch_y += 72
        
    # Bottom Call to Action for Stories
    cta_y = 1590
    cta_w = W - 100
    cta_h = 240
    cta_canvas = Image.new('RGBA', (cta_w, cta_h), (0, 0, 0, 0))
    cdraw = ImageDraw.Draw(cta_canvas)
    cdraw.rounded_rectangle((0, 0, cta_w, cta_h), radius=28, fill=(16, 16, 22, 255), outline=(212, 175, 55, 160), width=2)
    cdraw.rounded_rectangle((2, 2, cta_w - 2, 60), radius=28, fill=(212, 175, 55, 20))
    
    cdraw.text((36, 30), "JOIN BRILLIANT ACADEMY TODAY", font=ImageFont.truetype(font_bold, 24), fill=(255, 255, 255, 255))
    cdraw.text((36, 68), "Visit website or download Android APK to start learning immediately.", font=ImageFont.truetype(font_segoe, 15), fill=(180, 180, 195, 255))
    
    # Button
    btn_w, btn_h = cta_w - 72, 60
    btn_x = 36
    btn_y = 105
    cdraw.rounded_rectangle((btn_x, btn_y, btn_x + btn_w, btn_y + btn_h), radius=30, fill=(212, 175, 55, 255), outline=(245, 225, 140, 255), width=2)
    btn_title = "TAP TO VISIT WEBSITE & ENROLL  ➔"
    t_box = cdraw.textbbox((0, 0), btn_title, font=ImageFont.truetype(font_bold, 20))
    tw = t_box[2] - t_box[0]
    cdraw.text((btn_x + (btn_w - tw)//2, btn_y + 18), btn_title, font=ImageFont.truetype(font_bold, 20), fill=(10, 10, 12, 255))
    
    cdraw.text((36, 185), "🌐  www.brilliantacademy.lk", font=ImageFont.truetype(font_segoe_b, 15), fill=(245, 215, 110, 255))
    cdraw.text((cta_w - 240, 185), "📲  Android APK Ready", font=ImageFont.truetype(font_segoe_b, 14), fill=(52, 211, 153, 255))
    
    scta, cpad = add_drop_shadow(cta_canvas, offset=(0, 15), shadow_color=(0, 0, 0, 220), blur_radius=30)
    poster.paste(scta, (50 - cpad, cta_y - cpad), scta)
    
    final_story = Image.new('RGB', (W, H), (10, 10, 14))
    final_story.paste(poster, (0, 0), poster)
    
    p1 = os.path.join(PROJECT_DIR, "instagram_story_poster.png")
    p2 = os.path.join(ARTIFACT_DIR, "instagram_story_poster.png")
    final_story.save(p1, quality=95)
    final_story.save(p2, quality=95)
    print("Saved story poster:", p1)
    return final_story

def main():
    print("Building all Instagram posters...")
    build_portrait_poster()
    build_square_poster()
    build_story_poster()
    print("All Instagram posters successfully created and saved!")

if __name__ == "__main__":
    main()
