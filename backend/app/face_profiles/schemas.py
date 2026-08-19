from typing import Optional

from pydantic import BaseModel, ConfigDict


# ============================================================
# CREATE FACE PROFILE
# ============================================================

class FaceProfileCreate(BaseModel):
    employee_id: int


# ============================================================
# FACE PROFILE RESPONSE
# ============================================================

class FaceProfileResponse(BaseModel):
    id: int
    employee_id: int

    face_image_path: Optional[str] = None

    face_encoding_path: Optional[str] = None

    is_registered: bool = False

    model_config = ConfigDict(
        from_attributes=True
    )


# ============================================================
# UPDATE FACE PROFILE
# ============================================================

class FaceProfileUpdate(BaseModel):

    face_image_path: Optional[str] = None

    face_encoding_path: Optional[str] = None

    is_registered: Optional[bool] = None