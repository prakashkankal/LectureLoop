import json
import os
from datetime import date, datetime
from pathlib import Path

import requests

from .device_config import DEVICE_DIR, load_device_config


TIMETABLE_PATH = DEVICE_DIR / "config" / "timetable.json"


def sync_timetable(today=None, config=None, session=requests):
    today = today or date.today()
    config = config or load_device_config()
    day = today.strftime("%A")
    url = f"{config['server_url'].rstrip('/')}/api/device/timetable"
    response = session.get(
        url,
        params={"device_id": config["device_id"], "day": day},
        timeout=(5, 30),
    )
    response.raise_for_status()
    payload = response.json()
    if not payload.get("success") or not isinstance(payload.get("data"), list):
        raise ValueError("Timetable API returned an invalid response.")

    slots = payload["data"]
    for slot in slots:
        required = ("subject", "day", "start_time", "end_time")
        if not isinstance(slot, dict) or any(not slot.get(field) for field in required):
            raise ValueError("Timetable API returned an incomplete schedule entry.")

    timetable_path = TIMETABLE_PATH
    timetable_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = timetable_path.with_suffix(".json.tmp")
    try:
        with temporary_path.open("w", encoding="utf-8") as timetable_file:
            json.dump(
                {
                    "device_id": config["device_id"],
                    "day": day,
                    "synced_for": today.isoformat(),
                    "synced_at": datetime.now().astimezone().isoformat(),
                    "slots": slots,
                },
                timetable_file,
                indent=2,
            )
            timetable_file.flush()
            os.fsync(timetable_file.fileno())
        temporary_path.replace(timetable_path)
    except OSError:
        temporary_path.unlink(missing_ok=True)
        raise
    return slots
