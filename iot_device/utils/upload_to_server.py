import json
import re
import shutil
import uuid
from pathlib import Path

import requests
from pydub import AudioSegment

from .device_config import DEVICE_DIR, load_device_config


ATTENDANCE_DIR = DEVICE_DIR / "attendance" / "records"
AUDIO_DIR = DEVICE_DIR / "audio" / "recordings"
ATTENDANCE_ARCHIVE_DIR = DEVICE_DIR / "attendance" / "uploaded"
AUDIO_ARCHIVE_DIR = DEVICE_DIR / "audio" / "uploaded"
ATTENDANCE_FILENAME = re.compile(r"^attendance_(\d{4}-\d{2}-\d{2})\.csv$", re.IGNORECASE)


def upload_to_server(config=None, session=requests):
    """Upload pending attendance and audio by day; retain local copies if offline."""
    config = config or load_device_config()
    attendance_files = sorted(
        path for path in ATTENDANCE_DIR.glob("attendance_*.csv")
        if ATTENDANCE_FILENAME.fullmatch(path.name)
    )
    if not attendance_files:
        return not any(AUDIO_DIR.glob("*.mp3"))

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    ATTENDANCE_ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    AUDIO_ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    headers = {"x-device-token": config["device_token"]}
    url = f"{config['server_url'].rstrip('/')}/api/iot/upload"

    for attendance_path in attendance_files:
        day = ATTENDANCE_FILENAME.fullmatch(attendance_path.name).group(1)
        audio_files = sorted(AUDIO_DIR.glob("*.mp3"))
        metadata = {}
        matching_audio = []
        for audio_path in audio_files:
            sidecar = audio_path.with_suffix(".json")
            if not sidecar.is_file():
                raise FileNotFoundError(f"Audio metadata sidecar not found: {sidecar}")
            try:
                audio_metadata = json.loads(sidecar.read_text(encoding="utf-8"))
            except json.JSONDecodeError as error:
                raise ValueError(f"Invalid audio sidecar: {sidecar}") from error
            if audio_metadata.get("date") == day:
                matching_audio.append((audio_path, sidecar, audio_metadata))

        multipart = []
        try:
            with attendance_path.open("rb") as attendance_file:
                multipart.append(("attendance", (attendance_path.name, attendance_file, "text/csv")))
                for audio_path, sidecar, audio_metadata in matching_audio:
                    audio_file = audio_path.open("rb")
                    multipart.append(("audios", (audio_path.name, audio_file, "audio/mpeg")))
                    metadata[audio_path.name] = audio_metadata
                response = session.post(
                    url,
                    headers=headers,
                    data={
                        "device_id": config["device_id"],
                        "date": day,
                        "audio_metadata": json.dumps(metadata),
                    },
                    files=multipart,
                    timeout=(10, 180),
                )
                response.raise_for_status()
        except requests.RequestException:
            return False
        finally:
            for _, file_tuple in multipart:
                file_tuple[1].close()

        for audio_path, sidecar, _ in matching_audio:
            shutil.move(str(audio_path), _unique_destination(AUDIO_ARCHIVE_DIR / audio_path.name))
            shutil.move(str(sidecar), _unique_destination(AUDIO_ARCHIVE_DIR / sidecar.name))
        destination_csv = _unique_destination(ATTENDANCE_ARCHIVE_DIR / attendance_path.name)
        shutil.move(str(attendance_path), destination_csv)
    return True


def _unique_destination(destination):
    if not destination.exists():
        return destination
    return destination.with_name(f"{destination.stem}_{uuid.uuid4().hex[:8]}{destination.suffix}")


def record_metadata(mp3_path, subject, recorded_date, device_id):
    mp3_path = Path(mp3_path)
    duration = AudioSegment.from_mp3(mp3_path).duration_seconds
    metadata_path = mp3_path.with_suffix(".json")
    metadata_path.write_text(
        json.dumps({
            "subject": subject,
            "date": recorded_date.isoformat(),
            "device_id": device_id,
            "duration": duration,
        }, indent=2),
        encoding="utf-8",
    )
    return metadata_path
