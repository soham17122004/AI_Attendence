import os
import shutil
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
    status,
)

from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.face_profile import FaceProfile
from app.models.employee import Employee

from app.face_profiles.schemas import (
    FaceProfileResponse,
    FaceProfileUpdate,
)

from app.services.face_recognition_service import (
    generate_face_encoding,
    save_face_encoding,
)


router = APIRouter(
    prefix="/face-profiles",
    tags=["Face Profiles"]
)


# ============================================================
# STORAGE DIRECTORIES
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

FACE_STORAGE_DIR = BASE_DIR / "storage" / "faces"

FACE_STORAGE_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# CREATE FACE PROFILE FROM WEBCAM
# ============================================================

@router.post(
    "",
    response_model=FaceProfileResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_face_profile(
    employee_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # 1. Validate file
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # 2. Check employee
    # --------------------------------------------------------

    employee = (
        db.query(Employee)
        .filter(Employee.id == employee_id)
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    # --------------------------------------------------------
    # 3. Check existing profile
    # --------------------------------------------------------

    existing_profile = (
        db.query(FaceProfile)
        .filter(
            FaceProfile.employee_id == employee_id
        )
        .first()
    )

    if existing_profile:
        # Delete old photo file if present
        if existing_profile.face_image_path:
            old_img = Path(existing_profile.face_image_path)
            if old_img.exists():
                try: old_img.unlink()
                except Exception: pass
        # Delete old encoding file if present
        if existing_profile.face_encoding_path:
            old_enc = Path(existing_profile.face_encoding_path)
            if old_enc.exists():
                try: old_enc.unlink()
                except Exception: pass
        db.delete(existing_profile)
        db.commit()

    # --------------------------------------------------------
    # 4. Create employee face filename
    # --------------------------------------------------------

    extension = ".jpg"

    if file.filename:
        original_extension = Path(
            file.filename
        ).suffix.lower()

        if original_extension in [".jpg", ".jpeg", ".png"]:
            extension = original_extension

    face_filename = (
        f"employee_{employee_id}{extension}"
    )

    face_path = FACE_STORAGE_DIR / face_filename

    # --------------------------------------------------------
    # 5. Save uploaded webcam image
    # --------------------------------------------------------

    try:

        with open(face_path, "wb") as buffer:

            shutil.copyfileobj(
                file.file,
                buffer
            )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to save face image: {str(e)}"
        )

    # --------------------------------------------------------
    # 6. Generate face encoding
    # --------------------------------------------------------

    try:

        encoding = generate_face_encoding(
            str(face_path),
            employee_id
        )

    except FileNotFoundError as e:

        if face_path.exists():
            face_path.unlink()

        raise HTTPException(
            status_code=404,
            detail=str(e)
        )

    except ValueError as e:

        if face_path.exists():
            face_path.unlink()

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

    except Exception as e:

        if face_path.exists():
            face_path.unlink()

        raise HTTPException(
            status_code=500,
            detail=f"Face encoding failed: {str(e)}"
        )

    # --------------------------------------------------------
    # 7. Save face encoding
    # --------------------------------------------------------

    try:

        encoding_path = save_face_encoding(
            encoding,
            employee_id
        )

    except Exception as e:

        if face_path.exists():
            face_path.unlink()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to save face encoding: {str(e)}"
        )

    # --------------------------------------------------------
    # 8. Convert paths to strings
    # --------------------------------------------------------

    face_image_path = str(
        face_path
    )

    face_encoding_path = str(
        encoding_path
    )

    # --------------------------------------------------------
    # 9. Create database profile
    # --------------------------------------------------------

    try:

        new_profile = FaceProfile(
            employee_id=employee_id,
            face_image_path=face_image_path,
            face_encoding_path=face_encoding_path,
            is_registered=True
        )

        db.add(new_profile)

        db.commit()

        db.refresh(new_profile)

    except Exception as e:

        db.rollback()

        # Remove files if database fails

        if face_path.exists():
            face_path.unlink()

        try:

            encoding_file = Path(
                face_encoding_path
            )

            if encoding_file.exists():
                encoding_file.unlink()

        except Exception:
            pass

        raise HTTPException(
            status_code=500,
            detail=f"Failed to create face profile: {str(e)}"
        )

    # --------------------------------------------------------
    # 10. Return profile
    # --------------------------------------------------------

    return new_profile


# ============================================================
# GET ALL FACE PROFILES
# ============================================================

@router.get(
    "",
    response_model=list[FaceProfileResponse]
)
def get_face_profiles(
    db: Session = Depends(get_db)
):

    profiles = (
        db.query(FaceProfile)
        .order_by(FaceProfile.id.desc())
        .all()
    )

    return profiles


# ============================================================
# GET FACE PROFILE BY EMPLOYEE ID
# ============================================================

@router.get(
    "/employee/{employee_id}",
    response_model=FaceProfileResponse
)
def get_face_profile_by_employee(
    employee_id: int,
    db: Session = Depends(get_db)
):

    profile = (
        db.query(FaceProfile)
        .filter(
            FaceProfile.employee_id == employee_id
        )
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Face profile not found"
        )

    return profile


# ============================================================
# UPDATE FACE PROFILE
# ============================================================

@router.put(
    "/employee/{employee_id}",
    response_model=FaceProfileResponse
)
def update_face_profile(
    employee_id: int,
    profile_data: FaceProfileUpdate,
    db: Session = Depends(get_db)
):

    profile = (
        db.query(FaceProfile)
        .filter(
            FaceProfile.employee_id == employee_id
        )
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Face profile not found"
        )

    # --------------------------------------------------------
    # Update image path
    # --------------------------------------------------------

    if profile_data.face_image_path is not None:

        try:

            encoding = generate_face_encoding(
                profile_data.face_image_path,
                employee_id
            )

            encoding_path = save_face_encoding(
                encoding,
                employee_id
            )

            profile.face_image_path = (
                profile_data.face_image_path
            )

            profile.face_encoding_path = (
                str(encoding_path)
            )

            profile.is_registered = True

        except FileNotFoundError as e:

            raise HTTPException(
                status_code=404,
                detail=str(e)
            )

        except ValueError as e:

            raise HTTPException(
                status_code=400,
                detail=str(e)
            )

        except Exception as e:

            raise HTTPException(
                status_code=500,
                detail=f"Face encoding failed: {str(e)}"
            )

    # --------------------------------------------------------
    # Manual encoding path update
    # --------------------------------------------------------

    elif profile_data.face_encoding_path is not None:

        profile.face_encoding_path = (
            profile_data.face_encoding_path
        )

    # --------------------------------------------------------
    # Registration status
    # --------------------------------------------------------

    if profile_data.is_registered is not None:

        profile.is_registered = (
            profile_data.is_registered
        )

    db.commit()

    db.refresh(profile)

    return profile


# ============================================================
# DELETE FACE PROFILE
# ============================================================

@router.delete(
    "/employee/{employee_id}"
)
def delete_face_profile(
    employee_id: int,
    db: Session = Depends(get_db)
):

    profile = (
        db.query(FaceProfile)
        .filter(
            FaceProfile.employee_id == employee_id
        )
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Face profile not found"
        )

    # --------------------------------------------------------
    # Delete face image
    # --------------------------------------------------------

    if profile.face_image_path:

        image_path = Path(
            profile.face_image_path
        )

        if image_path.exists():

            try:
                image_path.unlink()
            except Exception:
                pass

    # --------------------------------------------------------
    # Delete encoding
    # --------------------------------------------------------

    if profile.face_encoding_path:

        encoding_path = Path(
            profile.face_encoding_path
        )

        if encoding_path.exists():

            try:
                encoding_path.unlink()
            except Exception:
                pass

    # --------------------------------------------------------
    # Delete database record
    # --------------------------------------------------------

    db.delete(profile)

    db.commit()

    return {
        "message": "Face profile deleted successfully",
        "employee_id": employee_id
    }