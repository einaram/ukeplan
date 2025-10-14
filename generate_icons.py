#!/usr/bin/env python3
"""
Simple icon generator for PWA
Creates basic colored squares as placeholder icons
"""
from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, filename):
    # Create image with gradient-like background
    img = Image.new('RGBA', (size, size), (102, 126, 234, 255))
    draw = ImageDraw.Draw(img)
    
    # Add a simple "W" text
    try:
        # Try to use a system font
        font_size = max(size // 3, 20)
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except:
        # Fallback to default font
        font = ImageFont.load_default()
    
    # Draw "W" in center
    text = "W"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (size - text_width) // 2
    y = (size - text_height) // 2
    
    draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)
    
    # Add rounded corners for larger icons
    if size >= 192:
        # Create mask for rounded corners
        mask = Image.new('L', (size, size), 0)
        mask_draw = ImageDraw.Draw(mask)
        corner_radius = size // 8
        mask_draw.rounded_rectangle([0, 0, size, size], radius=corner_radius, fill=255)
        
        # Apply mask
        img.putalpha(mask)
    
    # Save icon
    img.save(f"icons/{filename}")
    print(f"Created {filename} ({size}x{size})")

def main():
    # Create icons directory if it doesn't exist
    os.makedirs("icons", exist_ok=True)
    
    # Standard PWA icon sizes
    sizes = [
        (72, "icon-72x72.png"),
        (96, "icon-96x96.png"), 
        (128, "icon-128x128.png"),
        (144, "icon-144x144.png"),
        (152, "icon-152x152.png"),
        (192, "icon-192x192.png"),
        (384, "icon-384x384.png"),
        (512, "icon-512x512.png")
    ]
    
    for size, filename in sizes:
        create_icon(size, filename)
    
    print("All icons created successfully!")

if __name__ == "__main__":
    main()