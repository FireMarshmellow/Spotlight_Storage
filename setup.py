import os

# Get current Spotlight Storage folder path
current_dir = os.path.dirname(os.path.abspath(__file__))

# Folder paths
data_dir = os.path.join(current_dir, "data")
images_dir = os.path.join(current_dir, "images")

# Ensure the 'data' and 'images' directories exist
if not os.path.exists(data_dir):
    os.makedirs(data_dir)

if not os.path.exists(images_dir):
    os.makedirs(images_dir)

# Change .env-file
env_file = os.path.join(current_dir, ".env")

# Add/Write the new paths in the .env-file
with open(env_file, "w") as f:
    f.write(f"DATABASE_LOCATION={data_dir}\n")
    f.write(f"IMAGE_LOCATION={images_dir}\n")

print("Updated paths in .env-file!")
