
import json
import re
import time
from datetime import date, datetime, time as datetime_time
from pathlib import Path

import numpy as np
import sounddevice as sd
from pydub import AudioSegment


MODULE_DIR = Path(__file__).resolve().parent
TIMETABLE_PATH = MODULE_DIR.parent / "config" / "timetable.json"
RECORDINGS_DIR = MODULE_DIR / "recordings"
SAMPLE_RATE = 44_100
WEEKDAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
MONTHS = (
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
)


def _date_value(value):
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value))
    except ValueError as error:
        raise ValueError("date must be a date or an ISO YYYY-MM-DD string") from error


def _time_value(value):
    if isinstance(value, datetime_time):
        return value.replace(second=0, microsecond=0)
    if isinstance(value, (int, float)):
        minutes = round(float(value) * 24 * 60) % (24 * 60)
        return datetime_time(minutes // 60, minutes % 60)

    text = str(value).strip()
    for pattern in ("%H:%M", "%I:%M %p", "%I%p"):
        try:
            return datetime.strptime(text, pattern).time().replace(second=0, microsecond=0)
        except ValueError:
            continue
    raise ValueError(f"invalid timetable time: {value!r}")


def _read_timetable(path):
    try:
        with path.open(encoding="utf-8") as timetable_file:
            data = json.load(timetable_file)
    except FileNotFoundError as error:
        raise FileNotFoundError(f"Timetable file not found: {path}") from error
    except json.JSONDecodeError as error:
        raise ValueError(f"Timetable file is not valid JSON: {path}") from error

    if isinstance(data, dict):
        data = data.get("slots", data.get("timetable", data.get("data")))
    if not isinstance(data, list):
        raise ValueError("timetable.json must contain a list of timetable entries")
    return data


def _entry_value(entry, *keys):
    normalized = {str(key).strip().lower(): value for key, value in entry.items()}
    for key in keys:
        if key.lower() in normalized:
            return normalized[key.lower()]
    return None


def _safe_filename(value):
    safe = re.sub(r"[^A-Za-z0-9_-]+", "_", str(value).strip()).strip("_")
    if not safe:
        raise ValueError("subject cannot be empty")
    return safe


def start_recording(subject, date, timetable_path=TIMETABLE_PATH):
    """Wait for this subject's next slot today, record it, and return its WAV path."""
    requested_date = _date_value(date)
    subject_name = str(subject).strip()
    if not subject_name:
        raise ValueError("subject cannot be empty")

    weekday = WEEKDAYS[requested_date.weekday()]
    slots = []
    for entry in _read_timetable(Path(timetable_path)):
        if not isinstance(entry, dict):
            raise ValueError("each timetable entry must be a JSON object")
        entry_subject = _entry_value(entry, "subject")
        entry_day = _entry_value(entry, "day")
        if str(entry_subject or "").strip().casefold() != subject_name.casefold():
            continue
        if str(entry_day or "").strip().casefold() != weekday.casefold():
            continue

        start = _time_value(_entry_value(entry, "start_time", "start"))
        end = _time_value(_entry_value(entry, "end_time", "end"))
        if end <= start:
            raise ValueError(f"timetable end time must be after start time for {subject_name}")
        slots.append((start, end))

    if not slots:
        raise ValueError(f"No {subject_name} timetable slot found for {weekday}")

    now = datetime.now()
    current_date = now.date()
    if requested_date != current_date:
        raise ValueError("recording can only be scheduled for today's date")

    upcoming = [
        (start, end)
        for start, end in sorted(slots)
        if start > now.time().replace(second=0, microsecond=0)
    ]
    current_slot = next(
        (
            (start, end)
            for start, end in slots
            if start <= now.time().replace(second=0, microsecond=0) < end
        ),
        None,
    )
    if current_slot:
        slot_start, slot_end = current_slot
    elif upcoming:
        slot_start, slot_end = upcoming[0]
    else:
        raise ValueError(f"No upcoming {subject_name} timetable slot remains today")

    scheduled_start = datetime.combine(requested_date, slot_start)
    scheduled_end = datetime.combine(requested_date, slot_end)
    while datetime.now() < scheduled_start:
        time.sleep(min((scheduled_start - datetime.now()).total_seconds(), 1))

    duration_seconds = (scheduled_end - datetime.now()).total_seconds()
    if duration_seconds <= 0:
        raise ValueError("the timetable slot ended before recording could start")

    RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)
    hour = scheduled_start.hour % 12 or 12
    meridiem = "AM" if scheduled_start.hour < 12 else "PM"
    filename_date = f"{requested_date.day:02d}{MONTHS[requested_date.month - 1]}"
    filename = f"{_safe_filename(subject_name)}_{filename_date}_{hour}{meridiem}.wav"
    recording_path = RECORDINGS_DIR / filename
    if recording_path.exists():
        raise FileExistsError(f"Recording already exists: {recording_path}")

    recording = sd.rec(
        int(duration_seconds * SAMPLE_RATE),
        samplerate=SAMPLE_RATE,
        channels=1,
        dtype="int16",
    )
    sd.wait()
    AudioSegment(
        data=np.asarray(recording, dtype=np.int16).tobytes(),
        sample_width=2,
        frame_rate=SAMPLE_RATE,
        channels=1,
    ).export(recording_path, format="wav")
    return recording_path
