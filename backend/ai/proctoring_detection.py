import cv2
from insightface.app import FaceAnalysis

face_app = FaceAnalysis(
    name="buffalo_l",
    providers=["CPUExecutionProvider"]
)

face_app.prepare(ctx_id=0, det_size=(640, 640))


def detect_face_count(image_path: str):
    image = cv2.imread(image_path)

    if image is None:
        return {
            "success": False,
            "message": "Image not found",
            "face_count": 0
        }

    faces = face_app.get(image)

    return {
        "success": True,
        "face_count": len(faces)
    }