import argparse
import csv
import json
import tempfile
import threading
import time
import traceback
from datetime import date, datetime, time as datetime_time
from pathlib import Path

from utils.device_config import DEVICE_DIR, load_device_config
from utils.sync_timetable import sync_timetable


SYNC_TIME = datetime_time(8, 30)
UPLOAD_TIME = datetime_time(17, 0)
TIMETABLE_PATH = DEVICE_DIR / "config" / "timetable.json"


def _load_cached_timetable(today):
    try:
        with TIMETABLE_PATH.open(encoding="utf-8") as timetable_file:
            timetable = json.load(timetable_file)
    except FileNotFoundError:
        return []
    except json.JSONDecodeError as error:
        print(f"[iot] cached timetable is invalid: {error}")
        return []
    if timetable.get("synced_for") != today.isoformat():
        return []
    slots = timetable.get("slots")
    return slots if isinstance(slots, list) else []


def _cached_timetable_synced(today, device_id):
    try:
        with TIMETABLE_PATH.open(encoding="utf-8") as timetable_file:
            timetable = json.load(timetable_file)
    except (FileNotFoundError, json.JSONDecodeError):
        return False
    return (
        timetable.get("synced_for") == today.isoformat()
        and timetable.get("device_id") == device_id
        and isinstance(timetable.get("slots"), list)
    )


def _parse_slot_time(value):
    return datetime.strptime(str(value).strip(), "%H:%M").time()


def _run_slot(slot, today, config):
    from audio.compress import compress_wav_to_mp3
    from audio.record import start_recording
    from utils.upload_to_server import record_metadata

    subject = str(slot["subject"]).strip()
    try:
        wav_path = start_recording(subject, today, TIMETABLE_PATH)
        mp3_path = compress_wav_to_mp3(wav_path)
        record_metadata(mp3_path, subject, today, config["device_id"])
        print(f"[iot] audio ready: {mp3_path}")
    except Exception as error:
        print(f"[iot] audio recording failed for {subject}: {error}")
        traceback.print_exc()


def _run_attendance(slot, today, config):
    from attendance.camera_attendance import start_attendance

    try:
        csv_path = start_attendance(
            str(slot["subject"]),
            today,
            str(slot["end_time"]),
            str(slot.get("class_name", "")),
            str(slot.get("room_no", config.get("room", ""))),
            config["device_id"],
            int(config.get("camera_index", 0)),
            bool(config.get("show_attendance_display", True)),
        )
        print(f"[iot] attendance saved: {csv_path}")
    except Exception as error:
        print(f"[iot] attendance capture failed for {slot.get('subject', 'unknown subject')}: {error}")
        traceback.print_exc()


def _run_worker(target, args, worker_id, active_workers):
    try:
        target(*args)
    finally:
        active_workers.discard(worker_id)


def _start_slot(slot, today, config, started_slots, active_workers):
    slot_start = _parse_slot_time(slot["start_time"])
    key = (
        today.isoformat(),
        str(slot.get("subject", "")),
        slot_start.isoformat(),
        str(slot.get("class_name", "")),
        str(slot.get("room_no", config.get("room", ""))),
        str(slot.get("device_id", config["device_id"])),
    )
    if key in started_slots:
        return

    slot_end = _parse_slot_time(slot["end_time"])
    if slot_end <= slot_start:
        print(f"[iot] skipping invalid timetable slot: {slot}")
        started_slots.add(key)
        return

    started_slots.add(key)
    print(f"[iot] starting {slot.get('subject')} ({slot_start:%H:%M}-{slot_end:%H:%M})")
    for worker_name, target in (("attendance", _run_attendance), ("audio", _run_slot)):
        worker_id = (*key, worker_name)
        active_workers.add(worker_id)
        threading.Thread(
            target=_run_worker,
            args=(target, (slot, today, config), worker_id, active_workers),
            daemon=True,
            name=f"{worker_name}-{slot.get('subject', 'slot')}",
        ).start()


def _run_test(config):
    import imageio_ffmpeg
    import requests
    from pydub import AudioSegment

    AudioSegment.converter = imageio_ffmpeg.get_ffmpeg_exe()
    if config["device_token"] == "set-this-on-the-device":
        raise ValueError("Set IOT_UPLOAD_TOKEN to the same value configured on the server.")

    today = date.today()
    subject = "Virtual Test"
    filename = f"lecture_test_{today.isoformat()}.mp3"
    attendance = (
        "date,time,student,subject,class_name,room,device_id,status\n"
        f"{today.isoformat()},09:00:00,Virtual Student One,{subject},Test Class,"
        f"{config.get('room', '301')},{config['device_id']},Present\n"
        f"{today.isoformat()},09:01:00,Virtual Student Two,{subject},Test Class,"
        f"{config.get('room', '301')},{config['device_id']},Present\n"
    )
    metadata = {
        filename: {
            "subject": subject,
            "date": today.isoformat(),
            "device_id": config["device_id"],
            "duration": 10,
        },
    }

    with tempfile.TemporaryDirectory(prefix="lectureloop-iot-test-") as temporary_directory:
        audio_path = Path(temporary_directory) / filename
        AudioSegment.silent(duration=10_000, frame_rate=16_000).export(
            audio_path,
            format="mp3",
            bitrate="64k",
        )
        with audio_path.open("rb") as audio_file:
            response = requests.post(
                f"{config['server_url'].rstrip('/')}/api/iot/upload",
                headers={"x-device-token": config["device_token"]},
                data={
                    "device_id": config["device_id"],
                    "date": today.isoformat(),
                    "audio_metadata": json.dumps(metadata),
                },
                files=[
                    ("attendance", ("attendance_test.csv", attendance.encode("utf-8"), "text/csv")),
                    ("audios", (filename, audio_file, "audio/mpeg")),
                ],
                timeout=(10, 180),
            )
        if not response.ok:
            raise RuntimeError(f"IoT test upload failed ({response.status_code}): {response.text}")

    print(f"[iot] virtual device test completed: {response.json()}")


def main():
    parser = argparse.ArgumentParser(description="LectureLoop IoT device")
    parser.add_argument("--test", action="store_true", help="upload sample attendance and silent lecture audio")
    args = parser.parse_args()

    config = load_device_config()
    if args.test:
        _run_test(config)
        return

    current_day = date.today()
    slots = _load_cached_timetable(current_day)
    synced_today = _cached_timetable_synced(current_day, config["device_id"])
    started_slots = set()
    active_workers = set()
    upload_complete = False

    print(f"[iot] device {config['device_id']} online")
    while True:
        now = datetime.now()
        today = now.date()
        if today != current_day:
            current_day = today
            slots = _load_cached_timetable(today)
            synced_today = False
            started_slots.clear()
            upload_complete = False

        if now.time() >= SYNC_TIME and not synced_today:
            try:
                slots = sync_timetable(today=today, config=config)
                synced_today = True
                print(f"[iot] synced {len(slots)} timetable slots for {today}")
            except Exception as error:
                print(f"[iot] timetable sync failed; will retry: {error}")

        for slot in slots:
            try:
                slot_start = _parse_slot_time(slot["start_time"])
                slot_end = _parse_slot_time(slot["end_time"])
                if slot_start <= now.time() < slot_end:
                    _start_slot(slot, today, config, started_slots, active_workers)
            except (KeyError, TypeError, ValueError) as error:
                print(f"[iot] skipping invalid timetable entry {slot!r}: {error}")

        if now.time() >= UPLOAD_TIME and not upload_complete:
            if active_workers:
                print("[iot] scheduled capture still running; upload will wait until it finishes")
            else:
                try:
                    from utils.upload_to_server import upload_to_server

                    upload_complete = upload_to_server(config=config)
                    if upload_complete:
                        print(f"[iot] daily upload complete for {today}")
                    else:
                        print("[iot] upload queue remains; will retry in 60 seconds")
                except Exception as error:
                    print(f"[iot] upload failed; local files remain queued for retry: {error}")
                    traceback.print_exc()

        time.sleep(max(1, 60 - datetime.now().second))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("[iot] stopped")
