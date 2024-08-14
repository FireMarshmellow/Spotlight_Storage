import os

# Get current Spotlight Storage folder path
current_dir = os.path.dirname(os.path.abspath(__file__))

# Folder path'S
data_dir = os.path.join(current_dir, "data")
images_dir = os.path.join(current_dir, "images")

# Change .env-file
env_file = os.path.join(current_dir, ".env")

#Add/Write the new path's in the .env-file
with open(env_file, "w") as f:
    f.write(f"DATABASE_LOCATION={data_dir}\n")
    f.write(f"IMAGE_LOCATION={images_dir}\n")

print("Updated path's in .env-file!")
