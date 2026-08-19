import os
import pickle
import tempfile
from datetime import date, datetime, time, timedelta
from pathlib import Path

try:
    import face_recognition
except ImportError:
    face_recognition = None

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.face_profile import FaceProfile
from app.models.employee import Employee
from app.models.attendance import Attendance


router = APIRouter(
    prefix="/recognition",
    tags=["Face Recognition"]
)


# ============================================================
# PROJECT PATHS
# ============================================================

BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_DIR = Path(__file__).resolve().parents[3]

BACKEND_STORAGE = BACKEND_DIR / "storage"
PROJECT_STORAGE = PROJECT_DIR / "storage"


# ============================================================
# HELPER: RESOLVE STORAGE PATH
# ============================================================

def resolve_storage_path(file_path: str) -> Path | None:

    if not file_path:
        return None

    path = Path(file_path)

    # Absolute path
    if path.is_absolute():

        if path.exists():
            return path

        return None

    # Project storage
    project_path = PROJECT_DIR / path

    if project_path.exists():
        return project_path

    # Backend storage
    backend_path = BACKEND_DIR / path

    if backend_path.exists():
        return backend_path

    # Handle storage/...
    normalized = str(path).replace("\\", "/")

    if normalized.startswith("storage/"):

        relative_storage = Path(
            normalized.replace("storage/", "", 1)
        )

        project_storage_path = (
            PROJECT_STORAGE / relative_storage
        )

        if project_storage_path.exists():
            return project_storage_path

        backend_storage_path = (
            BACKEND_STORAGE / relative_storage
        )

        if backend_storage_path.exists():
            return backend_storage_path

    return None


# ============================================================
# FACE RECOGNITION
# ============================================================

@router.post("/recognize")
async def recognize_face(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Recognize employee using face recognition.

    First scan:
        Check-in

    Second scan:
        Check-out

    Third scan:
        Already checked out
    """

    # ========================================================
    # 1. VALIDATE FILE
    # ========================================================

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="File name is missing"
        )

    allowed_types = {
        "image/jpeg",
        "image/jpg",
        "image/png"
    }

    if file.content_type not in allowed_types:

        raise HTTPException(
            status_code=400,
            detail="Only JPG, JPEG and PNG images are allowed"
        )

    temp_path = None

    try:

        # ====================================================
        # 2. SAVE IMAGE TEMPORARILY
        # ====================================================

        file_extension = Path(
            file.filename
        ).suffix.lower()

        if file_extension not in {
            ".jpg",
            ".jpeg",
            ".png"
        }:

            file_extension = ".jpg"

        contents = await file.read()

        if not contents:

            raise HTTPException(
                status_code=400,
                detail="Uploaded image is empty"
            )

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=file_extension
        ) as temp_file:

            temp_path = temp_file.name

            temp_file.write(contents)

        # ====================================================
        # 3. LOAD IMAGE
        # ====================================================

        try:

            unknown_image = (
                face_recognition.load_image_file(
                    temp_path
                )
            )

        except Exception as e:

            raise HTTPException(
                status_code=400,
                detail=f"Unable to read image: {str(e)}"
            )

        # ====================================================
        # 4. DETECT FACE
        # ====================================================

        face_locations = (
            face_recognition.face_locations(
                unknown_image
            )
        )

        if len(face_locations) == 0:

            raise HTTPException(
                status_code=400,
                detail="No face detected in the uploaded image"
            )

        if len(face_locations) > 1:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Multiple faces detected. "
                    "Please upload an image containing only one face"
                )
            )

        # ====================================================
        # 5. GENERATE FACE ENCODING
        # ====================================================

        unknown_encodings = (
            face_recognition.face_encodings(
                unknown_image,
                face_locations
            )
        )

        if not unknown_encodings:

            raise HTTPException(
                status_code=400,
                detail="Could not generate face encoding"
            )

        unknown_encoding = unknown_encodings[0]

        # ====================================================
        # 6. GET REGISTERED FACE PROFILES
        # ====================================================

        profiles = (
            db.query(FaceProfile)
            .filter(
                FaceProfile.is_registered.is_(True)
            )
            .all()
        )

        if not profiles:

            raise HTTPException(
                status_code=404,
                detail="No registered face profiles found"
            )

        # ====================================================
        # 7. FIND BEST FACE MATCH
        # ====================================================

        best_employee_id = None
        best_distance = None
        matched_profile_id = None

        for profile in profiles:

            if not profile.face_encoding_path:
                continue

            encoding_path = resolve_storage_path(
                profile.face_encoding_path
            )

            if encoding_path is None:

                print(
                    "[WARNING] Encoding file not found:",
                    profile.face_encoding_path
                )

                continue

            print(
                f"[INFO] Loading encoding: {encoding_path}"
            )

            try:

                # --------------------------------------------
                # Load known encoding
                # --------------------------------------------

                with open(
                    encoding_path,
                    "rb"
                ) as encoding_file:

                    known_encoding = pickle.load(
                        encoding_file
                    )

                # --------------------------------------------
                # Validate encoding
                # --------------------------------------------

                if known_encoding is None:
                    continue

                if len(known_encoding) != 128:

                    print(
                        "[WARNING] Invalid encoding length:",
                        len(known_encoding)
                    )

                    continue

                # --------------------------------------------
                # Calculate face distance
                # --------------------------------------------

                distance = (
                    face_recognition.face_distance(
                        [known_encoding],
                        unknown_encoding
                    )[0]
                )

                distance = float(distance)

                print(
                    f"[INFO] Employee "
                    f"{profile.employee_id} "
                    f"distance: {distance:.4f}"
                )

                # --------------------------------------------
                # Keep best match
                # --------------------------------------------

                if (
                    best_distance is None
                    or distance < best_distance
                ):

                    best_distance = distance
                    best_employee_id = (
                        profile.employee_id
                    )
                    matched_profile_id = profile.id

            except Exception as e:

                print(
                    f"[ERROR] Encoding error: {e}"
                )

                continue

        # ====================================================
        # 8. FACE NOT FOUND
        # ====================================================

        if best_employee_id is None:

            raise HTTPException(
                status_code=404,
                detail="Face not recognized"
            )

        # ====================================================
        RECOGNITION_THRESHOLD = 0.78

        if best_distance > RECOGNITION_THRESHOLD:

            confidence = max(
                0.0,
                min(
                    1.0,
                    1.0 - best_distance
                )
            )

            raise HTTPException(
                status_code=401,
                detail={
                    "message": "Face not recognized",
                    "distance": round(
                        best_distance,
                        4
                    ),
                    "confidence": round(
                        confidence,
                        4
                    ),
                    "threshold": RECOGNITION_THRESHOLD
                }
            )

        # ====================================================
        # 10. CONFIDENCE
        # ====================================================

        confidence = max(
            0.0,
            min(
                1.0,
                1.0 - best_distance
            )
        )

        # ====================================================
        # 11. GET EMPLOYEE
        # ====================================================

        employee = (
            db.query(Employee)
            .filter(
                Employee.id == best_employee_id
            )
            .first()
        )

        if not employee:

            raise HTTPException(
                status_code=404,
                detail=(
                    "Employee associated with this "
                    "face was not found"
                )
            )

        # ====================================================
        # 12. GET TODAY'S ATTENDANCE
        # ====================================================

        today = date.today()

        attendance = (
            db.query(Attendance)
            .filter(
                Attendance.employee_id
                == best_employee_id,

                Attendance.attendance_date
                == today
            )
            .first()
        )

        # ====================================================
        # 13. FIRST SCAN = CHECK-IN
        # ====================================================

        if attendance is None:
            now_dt = datetime.now()
            # Late check-in rule: Check in after 10:00 AM (10:00:00) is marked late, but status remains present until check-out validation
            is_late = now_dt.time() > time(10, 0, 0)
            calc_status = "present"
            shift_hours = 4 if today.weekday() == 5 else 8
            calc_notes = f"Late Check-in after 10:00 AM ({shift_hours}h shift required)" if is_late else "Checked in using face recognition"

            new_attendance = Attendance(
                employee_id=best_employee_id,
                attendance_date=today,
                check_in=now_dt,
                check_out=None,
                status=calc_status,
                recognition_method="face_recognition",
                confidence_score=str(
                    round(
                        confidence,
                        4
                    )
                ),
                notes=calc_notes
            )

            db.add(new_attendance)

            db.commit()

            db.refresh(new_attendance)

            # Calculate expected shift check-out time (8h Mon-Fri, 4h Sat)
            shift_hours = 4 if today.weekday() == 5 else 8
            expected_checkout = now_dt + timedelta(hours=shift_hours)

            return {
                "success": True,
                "action": "check_in",
                "message": (
                    f"Late Check-In! Required {shift_hours}h shift ends at {expected_checkout.strftime('%I:%M %p')}"
                    if is_late else
                    f"Check-In Successful! {shift_hours}h shift ends at {expected_checkout.strftime('%I:%M %p')}"
                ),
                "employee_id": best_employee_id,
                "attendance_id": new_attendance.id,
                "attendance_date": str(
                    new_attendance.attendance_date
                ),
                "check_in": (
                    new_attendance.check_in.isoformat()
                    if new_attendance.check_in
                    else None
                ),
                "check_out": None,
                "status": new_attendance.status,
                "expected_checkout": expected_checkout.strftime('%I:%M %p'),
                "is_late": is_late,
                "recognition_method": (
                    new_attendance.recognition_method
                ),
                "confidence": round(
                    confidence,
                    4
                ),
                "distance": round(
                    best_distance,
                    4
                ),
                "face_profile_id": (
                    matched_profile_id
                )
            }

        # ====================================================
        # 14. SECOND SCAN = CHECK-OUT
        # ====================================================

        if attendance.check_out is None:
            now_dt = datetime.now()
            attendance.check_out = now_dt
            attendance.recognition_method = "face_recognition"

            # Check shift requirement (8h Mon-Fri, 4h Sat)
            completed_hours = 0.0
            is_early_checkout = False
            shift_hours_required = 4 if date.today().weekday() == 5 else 8
            shift_seconds_required = shift_hours_required * 3600
            
            if attendance.check_in:
                shift_seconds = (now_dt - attendance.check_in).total_seconds()
                completed_hours = round(shift_seconds / 3600.0, 2)
                # If worked less than required hours, mark as half_day
                if shift_seconds < shift_seconds_required:
                    is_early_checkout = True
                    attendance.status = "half_day"
                    attendance.notes = f"Early Check-Out after {completed_hours} hrs (< {shift_hours_required}h shift required). Marked as Half Day."
                else:
                    attendance.status = "present"
                    attendance.notes = f"Completed {completed_hours} hrs shift via face recognition."

            db.commit()

            db.refresh(attendance)

            return {
                "success": True,
                "action": "check_out",
                "message": (
                    f"Early Check-Out ({completed_hours}h worked < {shift_hours_required}h required). Marked as Half Day!"
                    if is_early_checkout else
                    f"Check-Out Successful! Shift completed ({completed_hours}h worked)."
                ),
                "employee_id": best_employee_id,
                "attendance_id": attendance.id,
                "attendance_date": str(
                    attendance.attendance_date
                ),
                "check_in": (
                    attendance.check_in.isoformat()
                    if attendance.check_in
                    else None
                ),
                "check_out": (
                    attendance.check_out.isoformat()
                    if attendance.check_out
                    else None
                ),
                "status": attendance.status,
                "completed_hours": completed_hours,
                "is_early_checkout": is_early_checkout,
                "recognition_method": (
                    attendance.recognition_method
                ),
                "confidence": round(
                    confidence,
                    4
                ),
                "distance": round(
                    best_distance,
                    4
                ),
                "face_profile_id": (
                    matched_profile_id
                )
            }

        # ====================================================
        # 15. THIRD SCAN = ALREADY CHECKED OUT
        # ====================================================

        return {
            "success": True,
            "action": "already_completed",
            "message": (
                "Employee has already checked out today"
            ),
            "employee_id": best_employee_id,
            "attendance_id": attendance.id,
            "attendance_date": str(
                attendance.attendance_date
            ),
            "check_in": (
                attendance.check_in.isoformat()
                if attendance.check_in
                else None
            ),
            "check_out": (
                attendance.check_out.isoformat()
                if attendance.check_out
                else None
            ),
            "status": attendance.status,
            "recognition_method": (
                attendance.recognition_method
            ),
            "confidence": round(
                confidence,
                4
            ),
            "distance": round(
                best_distance,
                4
            ),
            "face_profile_id": (
                matched_profile_id
            )
        }

    finally:

        # ====================================================
        # 16. DELETE TEMPORARY FILE
        # ====================================================

        if temp_path:

            try:

                if os.path.exists(temp_path):
                    os.remove(temp_path)

            except Exception as e:

                print(
                    "[WARNING] Could not delete "
                    f"temporary image: {e}"
                )