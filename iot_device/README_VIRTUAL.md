# LectureLoop Virtual Device (Windows)

The virtual device runs on a Windows laptop using its webcam and microphone. It downloads the device timetable at 8:30 AM, records attendance and lecture audio concurrently during scheduled classes, and uploads the day's attendance CSV and MP3 files from 5:00 PM. Failed uploads are copied to `output\` and remain queued locally for retry.

## Requirements

- Windows 10/11, Python 3.10, and a working webcam and microphone.
- The LectureLoop server running on this laptop at `http://localhost:5000`. MongoDB is needed for the rest of the app, but the IoT batch upload can save audio metadata to disk while MongoDB is offline.
- A timetable entry assigned to device ID `ROOM_301_VIRTUAL`.
- FFmpeg installed and available on `PATH` for pydub's MP3 conversion.
- `face_recognition` and its `dlib` dependency. Windows installation may require CMake and the Microsoft C++ Build Tools.

## Install

From PowerShell, enter the virtual device directory and create an isolated Python environment:

```powershell
cd .\iot_device
py -3.10 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements_virtual.txt
```

If PowerShell blocks activation, run the commands with `.\.venv\Scripts\python.exe` instead.
For the hardware-free `--test` command only, install `requests`, `pydub`, and
`imageio-ffmpeg` instead; camera dependencies and `face_recognition` are only needed
for scheduled camera attendance.

## Configure

`config/device_config.json` sets the device ID to `ROOM_301_VIRTUAL`, the room, webcam index, `audio_samplerate` to 16000, and `use_picamera` to `false`. Its `server_url` is `http://localhost:5000` for local development. JSON does not support comments; change that value to the deployed server's reachable origin (without `/api`) before using a remote server.

The device reads its upload token from the `IOT_UPLOAD_TOKEN` environment variable; it is not stored in the JSON file. Generate one token in PowerShell, copy it, and set it in both terminal windows. Keep the token private:

```powershell
$token = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
$env:IOT_UPLOAD_TOKEN = $token
Set-Clipboard -Value $token
```

In the server terminal, set `$env:IOT_UPLOAD_TOKEN = (Get-Clipboard -Raw).Trim()` before starting the server. In the device terminal, set it the same way before running the device. Each PowerShell window needs its own environment variable. Do not use a placeholder token or commit the token.

Put one clear JPG or PNG image containing exactly one face per student in `attendance\known_faces\`. Either put photos directly in that folder (the filename becomes the student's name), or use a named subfolder per student. These photos are biometric data; use them only with appropriate permission and keep them out of source control.

## Test immediately

Start the server in another terminal. Then, from `iot_device` with the Python environment activated and `IOT_UPLOAD_TOKEN` set, run:

```powershell
python main.py --test
```

Test mode does not use the camera, microphone, timetable, or face-recognition package. It creates a clearly labeled sample attendance CSV and 10-second silent MP3 in a temporary directory, then uploads that batch immediately. The temporary samples are deleted after the request and are not real attendance.

Exact local test steps:

1. Start the LectureLoop server from the repository's `server` directory. MongoDB may be offline for the IoT upload test.
2. In PowerShell, from `iot_device`, activate the virtual environment, set `$env:IOT_UPLOAD_TOKEN = (Get-Clipboard -Raw).Trim()`, then run `python main.py --test`.
3. Check the terminal for `virtual device test completed` (upload succeeded) or `Saved locally, server not running` (files are in `output\`).
4. To upload queued daily recordings without capturing again, use the scheduled uploader (`python main.py`) after its normal upload time.

The test does not require student photos or working camera/microphone hardware. Camera-based scheduled attendance still requires `face_recognition` and `dlib`.

## Scheduled mode and output

Run the normal schedule loop with:

```powershell
python main.py
```

It syncs the timetable at 8:30 AM, starts both captures during each matching class, and retries the daily upload after 5:00 PM. Keep this process running while classes take place.

- Attendance CSV: `attendance\records\attendance_YYYY-MM-DD.csv`
- Original WAV recordings and MP3 upload queue: `audio\recordings\`
- Successfully uploaded CSV and MP3 files: `attendance\uploaded\` and `audio\uploaded\`
- Downloaded timetable cache: `config\timetable.json`

The server stores uploaded attendance in `server\uploads\attendance\` and audio in `server\uploads\audios\`. Audio metadata is stored in MongoDB when connected, or in `server\uploads\audio-metadata\` while MongoDB is offline. Files uploaded during offline mode are saved on the server but will not appear in database-backed lecture views until MongoDB is available.

## Server API compatibility

This client follows the routes implemented in this repository: it requests `GET /api/device/timetable` with both `device_id` and the current `day`, then sends one multipart batch to `POST /api/iot/upload` using the `attendance`, `audios`, `device_id`, `date`, and `audio_metadata` fields plus the `x-device-token` header. The server currently does not implement `POST /api/iot/upload/attendance` or `/api/iot/upload/audio`.
