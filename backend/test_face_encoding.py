from app.services.face_recognition_service import (
    generate_face_encoding,
    save_face_encoding
)


image_path = "storage/faces/EMP002.jpg"
employee_id = 2


encoding = generate_face_encoding(
    image_path,
    employee_id
)

print("Encoding length:", len(encoding))

encoding_path = save_face_encoding(
    encoding,
    employee_id
)

print("Encoding path:", encoding_path)