import cv2
import numpy as np
import face_recognition

image_array = np.fromfile('biden.jpg', dtype=np.uint8)
image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

print('shape:', image_rgb.shape)
print('dtype:', image_rgb.dtype)
print('flags:', image_rgb.flags)

try:
    locs = face_recognition.face_locations(image_rgb)
    print("Success:", locs)
except Exception as e:
    print("Error:", e)
