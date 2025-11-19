from PIL import Image
import os
import zipfile
import io

# Load your image
image_path = "/Users/mtaasisi/Downloads/openart-image_kwzHqNfV_1761130223722_raw.jpg"  # <-- Replace with your file path
original_image = Image.open(image_path).convert("RGBA")

# Define coordinates for cropping each logo
crop_boxes = {
    "dukani_pro_blue": (20, 20, 260, 260),
    "shoppihm_green": (270, 20, 510, 260),
    "dukani_pro_orange": (20, 270, 260, 510),
    "miniral_purple": (270, 270, 510, 510),
    "credit_card_blue": (270, 520, 510, 760),
}

# Output directory
output_dir = "dukani_logos"
os.makedirs(output_dir, exist_ok=True)

# Background removal function
def remove_background(img, bg_color=(0, 0, 0), tolerance=50):
    datas = img.getdata()
    new_data = []
    for item in datas:
        if all(abs(item[i] - bg_color[i]) < tolerance for i in range(3)):
            new_data.append((255, 255, 255, 0))  # Transparent
        else:
            new_data.append(item)
    img.putdata(new_data)
    return img

# Crop, clean, and save
logo_files = []
for name, box in crop_boxes.items():
    cropped = original_image.crop(box)
    bg_removed = remove_background(cropped)
    logo_path = os.path.join(output_dir, f"{name}.png")
    bg_removed.save(logo_path, "PNG")
    logo_files.append(logo_path)

# Zip everything
zip_path = "dukani_pro_logos.zip"
with zipfile.ZipFile(zip_path, "w") as zipf:
    for file in logo_files:
        zipf.write(file, os.path.basename(file))

print(f"All logos saved and zipped at: {zip_path}")
