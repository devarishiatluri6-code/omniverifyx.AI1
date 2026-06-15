import cv2

face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades +
    "haarcascade_frontalface_default.xml"
)


def detect_faces(image_path):
    image = cv2.imread(image_path)

    if image is None:
        return {
            "success": False,
            "message": "Image not found"
        }

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(30, 30)
    )

    return {
        "success": True,
        "face_count": len(faces)
    }