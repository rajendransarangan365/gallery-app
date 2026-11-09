"""
OriginOS-inspired App Icon Generator
Creates high-fidelity multi-resolution icons for Windows (.ico, .png) and Android (.webp, .png).
Aesthetic: OriginOS Atomic Camera Aperture with luminous sapphire-violet-cyan gradients & squircle geometry.
"""

import os
import math
from PIL import Image, ImageDraw, ImageFilter

def create_originos_icon(size=1024):
    # Render at 2x for ultra-sharp supersampling
    scale = 2
    canvas_size = size * scale
    img = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx, cy = canvas_size / 2, canvas_size / 2
    r_outer = canvas_size * 0.44

    # 1. Super-smooth Squircle Background (OriginOS Atomic Card style)
    # OriginOS uses squircle with continuous curvature
    squircle_radius = canvas_size * 0.22
    margin = canvas_size * 0.05
    box = [margin, margin, canvas_size - margin, canvas_size - margin]

    # Create squircle mask
    mask = Image.new('L', (canvas_size, canvas_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(box, radius=squircle_radius, fill=255)

    # Background gradient: Deep Midnight Obsidian (#0B0F19) to Deep Slate (#1A2234)
    bg_gradient = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    for y in range(canvas_size):
        t = y / canvas_size
        r = int(11 * (1 - t) + 24 * t)
        g = int(15 * (1 - t) + 32 * t)
        b = int(25 * (1 - t) + 52 * t)
        line = Image.new('RGBA', (canvas_size, 1), (r, g, b, 255))
        bg_gradient.paste(line, (0, y))

    img.paste(bg_gradient, (0, 0), mask)

    # 2. Glowing ambient backdrop behind camera aperture
    glow = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse([cx - r_outer * 0.95, cy - r_outer * 0.95, cx + r_outer * 0.95, cy + r_outer * 0.95],
                      fill=(59, 130, 246, 60))
    glow = glow.filter(ImageFilter.GaussianBlur(canvas_size * 0.06))
    img.paste(glow, (0, 0), glow)

    # 3. Outer Neon Accent Ring (OriginOS Ocean Cyan to Purple gradient)
    ring_layer = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    ring_draw = ImageDraw.Draw(ring_layer)
    num_segments = 360
    ring_thickness = canvas_size * 0.038
    r_ring = canvas_size * 0.35

    for angle in range(num_segments):
        rad = math.radians(angle)
        rad_next = math.radians(angle + 1.5)
        # Gradient from Cyan (0, 242, 254) to Electric Blue (79, 70, 229) to Magenta (236, 72, 153)
        t = angle / 360.0
        if t < 0.33:
            sub_t = t / 0.33
            cr = int(0 * (1 - sub_t) + 79 * sub_t)
            cg = int(242 * (1 - sub_t) + 70 * sub_t)
            cb = int(254 * (1 - sub_t) + 229 * sub_t)
        elif t < 0.66:
            sub_t = (t - 0.33) / 0.33
            cr = int(79 * (1 - sub_t) + 236 * sub_t)
            cg = int(70 * (1 - sub_t) + 72 * sub_t)
            cb = int(229 * (1 - sub_t) + 153 * sub_t)
        else:
            sub_t = (t - 0.66) / 0.34
            cr = int(236 * (1 - sub_t) + 0 * sub_t)
            cg = int(72 * (1 - sub_t) + 242 * sub_t)
            cb = int(153 * (1 - sub_t) + 254 * sub_t)

        x1 = cx + (r_ring - ring_thickness / 2) * math.cos(rad)
        y1 = cy + (r_ring - ring_thickness / 2) * math.sin(rad)
        x2 = cx + (r_ring + ring_thickness / 2) * math.cos(rad)
        y2 = cy + (r_ring + ring_thickness / 2) * math.sin(rad)
        x3 = cx + (r_ring + ring_thickness / 2) * math.cos(rad_next)
        y3 = cy + (r_ring + ring_thickness / 2) * math.sin(rad_next)
        x4 = cx + (r_ring - ring_thickness / 2) * math.cos(rad_next)
        y4 = cy + (r_ring - ring_thickness / 2) * math.sin(rad_next)

        ring_draw.polygon([(x1, y1), (x2, y2), (x3, y3), (x4, y4)], fill=(cr, cg, cb, 245))

    img = Image.alpha_composite(img, ring_layer)

    # 4. Camera Body Inner Disc (Dark Matte Lens Housing)
    lens_bg = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    lens_draw = ImageDraw.Draw(lens_bg)
    r_lens = canvas_size * 0.31
    lens_draw.ellipse([cx - r_lens, cy - r_lens, cx + r_lens, cy + r_lens],
                      fill=(18, 22, 34, 255), outline=(255, 255, 255, 30), width=int(scale * 2))
    img = Image.alpha_composite(img, lens_bg)

    # 5. OriginOS Aperture Blades (6 dynamic iris blades)
    blade_layer = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    blade_draw = ImageDraw.Draw(blade_layer)
    num_blades = 6
    r_inner = canvas_size * 0.12
    r_blade_outer = canvas_size * 0.29

    for i in range(num_blades):
        a1 = math.radians(i * (360 / num_blades))
        a2 = math.radians(i * (360 / num_blades) + 48)
        a3 = math.radians((i + 1) * (360 / num_blades) + 20)

        p1 = (cx + r_inner * math.cos(a1), cy + r_inner * math.sin(a1))
        p2 = (cx + r_blade_outer * math.cos(a2), cy + r_blade_outer * math.sin(a2))
        p3 = (cx + r_blade_outer * math.cos(a3), cy + r_blade_outer * math.sin(a3))

        blade_color = (28 + i * 5, 36 + i * 6, 54 + i * 8, 230)
        blade_draw.polygon([p1, p2, p3], fill=blade_color, outline=(79, 140, 255, 70))

    img = Image.alpha_composite(img, blade_layer)

    # 6. Central Radiant Lens Core / Sensor Reflection (Electric Blue Glass)
    core = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    core_draw = ImageDraw.Draw(core)
    core_draw.ellipse([cx - r_inner * 0.9, cy - r_inner * 0.9, cx + r_inner * 0.9, cy + r_inner * 0.9],
                      fill=(14, 165, 233, 230), outline=(255, 255, 255, 120), width=int(scale * 3))

    # Inner lens glow
    core_draw.ellipse([cx - r_inner * 0.45, cy - r_inner * 0.45, cx + r_inner * 0.45, cy + r_inner * 0.45],
                      fill=(255, 255, 255, 220))
    img = Image.alpha_composite(img, core)

    # 7. Subtle Glass Reflection Arcs (Top left highlight)
    highlight = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    h_draw = ImageDraw.Draw(highlight)
    h_box = [cx - r_ring * 0.88, cy - r_ring * 0.88, cx + r_ring * 0.88, cy + r_ring * 0.88]
    h_draw.arc(h_box, start=195, end=255, fill=(255, 255, 255, 140), width=int(scale * 4))
    img = Image.alpha_composite(img, highlight)

    # 8. OriginOS Subtle Hairline Border around Squircle
    border = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    b_draw = ImageDraw.Draw(border)
    b_draw.rounded_rectangle(box, radius=squircle_radius, outline=(255, 255, 255, 38), width=int(scale * 2.5))
    img = Image.alpha_composite(img, border)

    # Downsample with Lanczos high quality filter
    final_icon = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_icon

def generate_all_icons(workspace_dir):
    print("[*] Generating OriginOS aesthetic app icons...")

    base_1024 = create_originos_icon(1024)

    # Windows build assets
    win_build_dir = os.path.join(workspace_dir, "apps", "windows", "build")
    os.makedirs(win_build_dir, exist_ok=True)

    win_png_path = os.path.join(win_build_dir, "icon.png")
    base_1024.save(win_png_path, "PNG")
    print(f"  [+] Windows PNG saved: {win_png_path}")

    # Generate multi-size ICO for Windows
    ico_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    ico_images = [base_1024.resize(s, Image.Resampling.LANCZOS) for s in ico_sizes]
    win_ico_path = os.path.join(win_build_dir, "icon.ico")
    ico_images[0].save(win_ico_path, format="ICO", sizes=ico_sizes)
    print(f"  [+] Windows multi-res ICO saved: {win_ico_path}")

    # Android assets directory
    android_assets_dir = os.path.join(workspace_dir, "apps", "android", "assets")
    os.makedirs(android_assets_dir, exist_ok=True)
    android_icon_png = os.path.join(android_assets_dir, "icon.png")
    base_1024.save(android_icon_png, "PNG")
    adaptive_icon_png = os.path.join(android_assets_dir, "adaptive-icon.png")
    base_1024.save(adaptive_icon_png, "PNG")
    print(f"  [+] Android Expo assets saved: {android_icon_png}")

    # Android native mipmap folders
    res_dir = os.path.join(workspace_dir, "apps", "android", "android", "app", "src", "main", "res")
    mipmap_targets = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }

    # Circular mask for round icons
    round_mask = Image.new('L', (1024, 1024), 0)
    round_draw = ImageDraw.Draw(round_mask)
    round_draw.ellipse([40, 40, 984, 984], fill=255)
    round_base = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    round_base.paste(base_1024, (0, 0), round_mask)

    for folder, px in mipmap_targets.items():
        folder_path = os.path.join(res_dir, folder)
        if os.path.exists(folder_path):
            # Standard square squircle icon
            sq_img = base_1024.resize((px, px), Image.Resampling.LANCZOS)
            sq_path = os.path.join(folder_path, "ic_launcher.webp")
            sq_img.save(sq_path, "WEBP", quality=95)

            # Round launcher icon
            rd_img = round_base.resize((px, px), Image.Resampling.LANCZOS)
            rd_path = os.path.join(folder_path, "ic_launcher_round.webp")
            rd_img.save(rd_path, "WEBP", quality=95)
            print(f"  [+] Updated {folder} ({px}x{px}): ic_launcher.webp & ic_launcher_round.webp")

    print("[DONE] All OriginOS app icons generated successfully!")

if __name__ == "__main__":
    workspace = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    generate_all_icons(workspace)
