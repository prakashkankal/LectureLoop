import json
from pathlib import Path


DEVICE_DIR = Path(__file__).resolve().parents[1]
CONFIG_PATH = DEVICE_DIR / "config" / "device_config.json"


def load_device_config():
    try:
        with CONFIG_PATH.open(encoding="utf-8") as config_file:
            config = json.load(config_file)
    except FileNotFoundError as error:
        raise FileNotFoundError(f"Create the Raspberry Pi configuration file at {CONFIG_PATH}") from error
    except json.JSONDecodeError as error:
        raise ValueError(f"Invalid Raspberry Pi configuration JSON: {CONFIG_PATH}") from error

    required = ("device_id", "server_url", "device_token")
    missing = [key for key in required if not str(config.get(key, "")).strip()]
    if missing:
        raise ValueError(f"Missing device configuration values: {', '.join(missing)}")
    if config["device_token"] == "set-this-on-the-device":
        raise ValueError("Replace the device_token placeholder before starting the Pi service.")
    return config
