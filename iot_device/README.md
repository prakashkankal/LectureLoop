# LectureLoop Raspberry Pi

The Pi runs the timetable-driven classroom attendance and audio capture loop. It downloads the day's schedule at 8:30 AM, starts camera attendance and microphone recording at each slot's start time, then uploads that day's CSV and MP3 files at 5:00 PM. Failed/offline uploads remain on the Pi and are retried every minute.

## Hardware placement

- Mount the camera about 2 m inside the classroom door, at 7 ft height, with a wide-angle lens of approximately 120 degrees.
- Place the microphone at the center of the ceiling.
- Keep the display visible to the class; it shows the names recognized as Present during attendance scanning.
- Connect the camera and microphone and verify they are visible to the Raspberry Pi before enabling the service.

## Prepare the Pi

Use Raspberry Pi OS with a desktop session if the attendance display is enabled. Configure Wi-Fi through Raspberry Pi OS/network settings; `wifi` in `config/device_config.json` is an informational SSID label and does not contain a Wi-Fi password.

Install system packages:

```sh
sudo apt update
sudo apt install -y python3-venv python3-dev build-essential cmake ffmpeg portaudio19-dev libatlas-base-dev
```

Copy this `iot_device` directory to `/home/pi/iot_device`, then create a virtual environment and install Python requirements:

```sh
cd /home/pi/iot_device
python3 -m venv .venv
. .venv/bin/activate
pip install --upgrade pip
pip install -r requirements_pi.txt
```

`face_recognition` depends on `dlib`; on Raspberry Pi this can take several minutes to compile. Install additional OS libraries if its build reports a missing compiler or CMake dependency.

## Configure the device

Edit `config/device_config.json` on the Pi:

- Set `device_id` and `room` to match the timetable and classroom.
- Set `server_url` to the reachable LectureLoop server origin, without an `/api` suffix.
- Set `device_token` to the same strong secret configured as `IOT_UPLOAD_TOKEN` on the server. Do not commit a real token.
- Set `camera_index` for the attached camera. Set `show_attendance_display` to `false` only when running without a graphical display.

The server must be configured with `IOT_UPLOAD_TOKEN`, and the device must be able to reach it. The timetable is downloaded automatically to `config/timetable.json`; do not edit that generated file by hand.

## Enroll students

Add a clear, front-facing JPG or PNG image for each student under `attendance/known_faces/`. Either use a folder named after the student:

```text
attendance/known_faces/Asha Patel/front.jpg
attendance/known_faces/Ravi Shah/front.jpg
```

or place one image per student directly in `known_faces/` and use the image filename as their name. Each enrollment image must contain exactly one recognizable face. Keep roster images private and provision them only on the classroom Pi.

Roster photos are excluded from version control because they contain biometric data.

Attendance is appended to `attendance/records/attendance_YYYY-MM-DD.csv`. Audio WAV recordings and compressed MP3s are kept under `audio/recordings/` until their day uploads successfully. Successfully uploaded files are moved into each module's `uploaded/` folder; WAV originals remain local.

## Start automatically at boot

Install the supplied cron entry:

```sh
crontab -e
```

Add the line from `lectureloop.cron`:

```cron
@reboot cd /home/pi/iot_device && /usr/bin/python3 /home/pi/iot_device/main.py >> /home/pi/iot_device/main.log 2>&1
```

If using the virtual environment, use `/home/pi/iot_device/.venv/bin/python` instead of `/usr/bin/python3`.

Set the Pi's correct time zone and enable network time synchronization so timetable times match the classroom's local time. Check logs with:

```sh
tail -f /home/pi/iot_device/main.log
```

## Upload contract

At 5:00 PM the device sends one multipart `POST /api/iot/upload` per date with:

- `attendance`: the daily CSV file.
- `audios`: zero or more MP3 files from that date.
- `device_id`, `date` (`YYYY-MM-DD`), and `audio_metadata` form fields.
- `x-device-token`: the configured shared device token.

The server stores attendance CSV files in `server/uploads/attendance/`, audio files in `server/uploads/audios/`, and audio metadata in MongoDB. If the server is unavailable, source files remain queued locally and the Pi retries on its next loop.
