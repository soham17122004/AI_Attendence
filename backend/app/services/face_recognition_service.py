import os
import pickle
from pathlib import Path

import logging

logger = logging.getLogger(__name__)

try:
    import face_recognition
except ImportError:
    face_recognition = None
    logger.warning(
        "face_recognition library not installed. "
        "Face recognition features will be unavailable. "
        "Install with: pip install face_recognition (requires dlib + Visual C++ Build Tools on Windows)"
    )


# ============================================================
# DIRECTORIES
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

FACE_STORAGE_DIR = BASE_DIR / "storage" / "faces"
ENCODING_STORAGE_DIR = BASE_DIR / "storage" / "encodings"

FACE_STORAGE_DIR.mkdir(
    parents=True,
    exist_ok=True
)

ENCODING_STORAGE_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# SETTINGS
# ============================================================

# Lower = stricter matching, 0.78 for high mobile camera lens tolerance
FACE_DISTANCE_THRESHOLD = 0.78


# ============================================================
# GUARD: Ensure face_recognition is available
# ============================================================

def _require_face_recognition():
    if face_recognition is None:
        raise RuntimeError(
            "face_recognition library is not installed. "
            "Install dlib and face_recognition to use face recognition features."
        )


# ============================================================
# GENERATE FACE ENCODING
# ============================================================

def generate_face_encoding(
    image_path: str,
    employee_id: int
):
    """
    Load an employee face image and generate
    a 128-dimensional face encoding.
    """
    _require_face_recognition()

    if not os.path.exists(image_path):
        raise FileNotFoundError(
            f"Face image not found: {image_path}"
        )

    image = face_recognition.load_image_file(
        image_path
    )

    face_locations = face_recognition.face_locations(
        image
    )

    if len(face_locations) == 0:
        raise ValueError(
            "No face detected in the uploaded image"
        )

    if len(face_locations) > 1:
        raise ValueError(
            "Multiple faces detected. Please upload an image containing only one face"
        )

    encodings = face_recognition.face_encodings(
        image,
        known_face_locations=face_locations
    )

    if not encodings:
        raise ValueError(
            "Unable to generate face encoding"
        )

    encoding = encodings[0]

    if len(encoding) != 128:
        raise ValueError(
            f"Invalid face encoding length: {len(encoding)}"
        )

    return encoding


# ============================================================
# SAVE FACE ENCODING
# ============================================================

def save_face_encoding(
    encoding,
    employee_id: int
):
    """
    Save employee face encoding as a pickle file.
    """

    encoding_path = (
        ENCODING_STORAGE_DIR
        / f"employee_{employee_id}.pkl"
    )

    with open(
        encoding_path,
        "wb"
    ) as encoding_file:

        pickle.dump(
            encoding,
            encoding_file
        )

    return str(encoding_path)


# ============================================================
# LOAD FACE ENCODING
# ============================================================

def load_face_encoding(
    encoding_path: str
):
    """
    Load a saved face encoding.
    """

    if not os.path.exists(encoding_path):
        raise FileNotFoundError(
            f"Face encoding not found: {encoding_path}"
        )

    with open(
        encoding_path,
        "rb"
    ) as encoding_file:

        encoding = pickle.load(
            encoding_file
        )

    return encoding


# ============================================================
# COMPARE TWO FACE ENCODINGS
# ============================================================

def compare_face_encodings(
    known_encoding,
    unknown_encoding
):
    """
    Return face distance between two encodings.
    """
    _require_face_recognition()

    distance = face_recognition.face_distance(
        [known_encoding],
        unknown_encoding
    )[0]

    return float(distance)


# ============================================================
# CHECK FACE MATCH
# ============================================================

def is_face_match(
    known_encoding,
    unknown_encoding,
    threshold: float = FACE_DISTANCE_THRESHOLD
):
    """
    Check whether two face encodings match.
    """

    distance = compare_face_encodings(
        known_encoding,
        unknown_encoding
    )

    confidence = max(
        0.0,
        min(
            1.0,
            1.0 - distance
        )
    )

    return {
        "match": distance <= threshold,
        "distance": round(distance, 4),
        "confidence": round(confidence, 4)
    }


# ============================================================
# RECOGNIZE FACE
# ============================================================

def recognize_face(
    image,
    profiles,
    threshold: float = FACE_DISTANCE_THRESHOLD
):
    """
    Recognize a face from an image against all
    registered FaceProfile records.

    Parameters
    ----------
    image:
        RGB image as a NumPy array.

    profiles:
        List of FaceProfile database objects.

    threshold:
        Maximum face distance allowed for a match.
    """

    _require_face_recognition()

    # --------------------------------------------------------
    # Detect faces in uploaded image
    # --------------------------------------------------------

    face_locations = face_recognition.face_locations(
        image
    )

    if len(face_locations) == 0:

        return {
            "recognized": False,
            "message": "No face detected in the image",
            "confidence": 0.0,
            "distance": 1.0
        }

    # --------------------------------------------------------
    # Only allow one face at a time
    # --------------------------------------------------------

    if len(face_locations) > 1:

        return {
            "recognized": False,
            "message": "Multiple faces detected. Please keep only one person in front of the camera",
            "confidence": 0.0,
            "distance": 1.0
        }

    # --------------------------------------------------------
    # Generate encoding for scanned face
    # --------------------------------------------------------

    unknown_encodings = face_recognition.face_encodings(
        image,
        known_face_locations=face_locations
    )

    if not unknown_encodings:

        return {
            "recognized": False,
            "message": "Unable to generate face encoding",
            "confidence": 0.0,
            "distance": 1.0
        }

    unknown_encoding = unknown_encodings[0]

    # --------------------------------------------------------
    # Find best matching employee
    # --------------------------------------------------------

    best_match = None

    best_distance = float("inf")

    best_confidence = 0.0

    best_profile_id = None

    best_employee_id = None

    # --------------------------------------------------------
    # Compare against every registered employee
    # --------------------------------------------------------

    for profile in profiles:

        encoding_path = getattr(
            profile,
            "face_encoding_path",
            None
        )

        if not encoding_path:
            continue

        # ----------------------------------------------------
        # Load employee encoding
        # ----------------------------------------------------

        try:

            known_encoding = load_face_encoding(
                encoding_path
            )

        except FileNotFoundError:

            # Skip broken/missing encoding
            continue

        except Exception:

            # Skip invalid encoding
            continue

        # ----------------------------------------------------
        # Compare
        # ----------------------------------------------------

        try:

            result = is_face_match(
                known_encoding,
                unknown_encoding,
                threshold
            )

        except Exception:

            continue

        distance = result["distance"]

        confidence = result["confidence"]

        # ----------------------------------------------------
        # Keep BEST match
        # ----------------------------------------------------

        if distance < best_distance:

            best_distance = distance

            best_confidence = confidence

            best_profile_id = getattr(
                profile,
                "id",
                None
            )

            best_employee_id = getattr(
                profile,
                "employee_id",
                None
            )

            best_match = result["match"]

    # --------------------------------------------------------
    # No usable profiles
    # --------------------------------------------------------

    if best_employee_id is None:

        return {
            "recognized": False,
            "message": "No valid face encodings found",
            "confidence": 0.0,
            "distance": 1.0
        }

    # --------------------------------------------------------
    # Best match found but distance too high
    # --------------------------------------------------------

    if not best_match:

        return {
            "recognized": False,
            "message": "Face not recognized. No matching employee found",
            "employee_id": best_employee_id,
            "face_profile_id": best_profile_id,
            "confidence": best_confidence,
            "distance": best_distance
        }

    # --------------------------------------------------------
    # SUCCESS
    # --------------------------------------------------------

    return {
        "recognized": True,
        "message": "Face recognized successfully",
        "employee_id": best_employee_id,
        "face_profile_id": best_profile_id,
        "confidence": best_confidence,
        "distance": best_distance
    }