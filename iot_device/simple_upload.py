import os
import requests
import glob

SERVER_URL = "http://localhost:5000/api/iot/upload"
TOKEN = "ROOM301_SECRET_12345"

# Find latest files in output/
output_dir = "output"
csv_files = glob.glob(os.path.join(output_dir, "attendance*.csv"))
mp3_files = glob.glob(os.path.join(output_dir, "*.mp3"))

if not csv_files:
    print("No CSV found in output/")
    exit()

latest_csv = max(csv_files, key=os.path.getmtime)
print(f"Using CSV: {latest_csv}")

# Use latest 1-2 mp3s (or all)
latest_mp3s = sorted(mp3_files, key=os.path.getmtime, reverse=True)[:1]
print(f"Using MP3s: {latest_mp3s}")

# Prepare files
files = []
files.append(('attendance', (os.path.basename(latest_csv), open(latest_csv, 'rb'), 'text/csv')))
for mp3 in latest_mp3s:
    files.append(('audios', (os.path.basename(mp3), open(mp3, 'rb'), 'audio/mpeg')))

headers = {'x-device-token': TOKEN}

print(f"Uploading to {SERVER_URL}...")
resp = requests.post(SERVER_URL, files=files, headers=headers)

print(f"Status: {resp.status_code}")
print(f"Response: {resp.text}")

# Close files
for _, f in files:
    f[1].close()

if resp.status_code == 200:
    print("\n✅ Upload SUCCESS! Check server terminal and server storage folder!")
else:
    print("\n❌ Upload failed")
    