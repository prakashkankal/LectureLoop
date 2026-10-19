import csv
import threading
import time
from datetime import date, datetime, time as datetime_time
from pathlib import Path

import cv2
import face_recognition


MODULE_DIR = Path(__file__).resolve().parent
KNOWN_FACES_DIR = MODULE_DIR / "known_faces"
ATTENDANCE_DIR = MODULE_DIR / "records"
CSV_LOCK = threading.Lock()
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
CSV_FIELDS = ("date", "time", "student", "subject", "class_name", "room", "device_id", "status")


def _load_known_faces():
    encodings = []
    names = []
    for image_path in sorted(KNOWN_FACES_DIR.rglob("*")):
        if not image_path.is_file() or image_path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        image = face_recognition.load_image_file(str(image_path))
        image_encodings = face_recognition.face_encodings(image)
        if len(image_encodings) != 1:
            raise ValueError(f"Expected one recognizable face in roster image: {image_path}")
        encodings.append(image_encodings[0])
        names.append(image_path.parent.name if image_path.parent != KNOWN_FACES_DIR else image_path.stem)
    if not encodings:
        raise FileNotFoundError(
            f"No roster photos found. Add one JPG/PNG face image per student under {KNOWN_FACES_DIR}."
        )
    return encodings, names


def _student_name(face_encoding, known_encodings, known_names):
    matches = face_recognition.compare_faces(known_encodings, face_encoding, tolerance=0.48)
    distances = face_recognition.face_distance(known_encodings, face_encoding)
    matching_indexes = [index for index, matched in enumerate(matches) if matched]
    if not matching_indexes:
        return None
    best_index = min(matching_indexes, key=lambda index: distances[index])
    return known_names[best_index]


def start_attendance(
    subject,
    attendance_date,
    end_time,
    class_name="",
    room="",
    device_id="",
    camera_index=0,
    show_display=True,
):
    """Scan the classroom camera until the scheduled slot end and append recognized students."""
    if isinstance(attendance_date, datetime):
        attendance_date = attendance_date.date()
    elif not isinstance(attendance_date, date):
        attendance_date = date.fromisoformat(str(attendance_date))
    if isinstance(end_time, datetime_time):
        slot_end = end_time
    else:
        slot_end = datetime.strptime(str(end_time).strip(), "%H:%M").time()

    ATTENDANCE_DIR.mkdir(parents=True, exist_ok=True)
    csv_path = ATTENDANCE_DIR / f"attendance_{attendance_date.isoformat()}.csv"
    present = set()
    with CSV_LOCK:
        if csv_path.exists():
            with csv_path.open(newline="", encoding="utf-8") as attendance_file:
                present.update(
                    row["student"]
                    for row in csv.DictReader(attendance_file)
                    if row.get("subject", "").casefold() == str(subject).casefold()
                    and row.get("class_name", "").casefold() == str(class_name).casefold()
                )
        else:
            with csv_path.open("w", newline="", encoding="utf-8") as attendance_file:
                csv.DictWriter(attendance_file, fieldnames=CSV_FIELDS).writeheader()
    known_encodings, known_names = _load_known_faces()

    camera = cv2.VideoCapture(camera_index)
    if not camera.isOpened():
        camera.release()
        raise RuntimeError("Unable to open the classroom camera.")
    if show_display:
        cv2.namedWindow("LectureLoop Attendance", cv2.WINDOW_NORMAL)

    try:
        with csv_path.open("a", newline="", encoding="utf-8") as attendance_file:
            writer = csv.DictWriter(attendance_file, fieldnames=CSV_FIELDS)
            while datetime.now().time() < slot_end:
                ok, frame = camera.read()
                if not ok:
                    raise RuntimeError("Unable to read a frame from the classroom camera.")

                small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
                rgb_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
                locations = face_recognition.face_locations(rgb_frame, model="hog")
                face_encodings = face_recognition.face_encodings(rgb_frame, locations)
                frame_present = set()
                for face_encoding in face_encodings:
                    name = _student_name(face_encoding, known_encodings, known_names)
                    if name:
                        frame_present.add(name)
                        if name not in present:
                            now = datetime.now()
                            with CSV_LOCK:
                                writer.writerow({
                                    "date": attendance_date.isoformat(),
                                    "time": now.strftime("%H:%M:%S"),
                                    "student": name,
                                    "subject": subject,
                                    "class_name": class_name,
                                    "room": room,
                                    "device_id": device_id,
                                    "status": "Present",
                                })
                                attendance_file.flush()
                                present.add(name)

                for top, right, bottom, left in locations:
                    top, right, bottom, left = (value * 4 for value in (top, right, bottom, left))
                    cv2.rectangle(frame, (left, top), (right, bottom), (40, 180, 90), 2)

                if present:
                    cv2.putText(
                        frame,
                        f"Present: {', '.join(sorted(present))}",
                        (20, 35),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.7,
                        (40, 180, 90),
                        2,
                    )
                if show_display:
                    cv2.imshow("LectureLoop Attendance", frame)
                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        break
                time.sleep(0.1)
    finally:
        camera.release()
        if show_display:
            cv2.destroyAllWindows()

    return csv_path
