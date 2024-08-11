import os

# Aktuelles Verzeichnis ermitteln
current_dir = os.path.dirname(os.path.abspath(__file__))

# Ordnerpfade
data_dir = os.path.join(current_dir, "data")
pictures_dir = os.path.join(current_dir, "pictures")

# .env-Datei anpassen
env_file = os.path.join(current_dir, ".env")

# Neue Umgebungsvariablen in die .env-Datei schreiben
with open(env_file, "w") as f:
    f.write(f"DATABASE_LOCATION={data_dir}\n")
    f.write(f"IMAGE_LOCATION={pictures_dir}\n")

print("Pfade in .env-Datei wurden aktualisiert.")
