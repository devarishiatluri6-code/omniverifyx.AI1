import cv2
import json
import os

from insightface.app import FaceAnalysis

face_app = FaceAnalysis(
    name="buffalo_l",
    providers=["CPUExecutionProvider"]
)

face_app.prepare(
    ctx_id=0,
    det_size=(640, 640)
)


def enroll_face(image_path, user_id):
    img = cv2.imread(image_path)

    if img is None:
        return {
            "success": False,
            "message": "Image not found"
        }

    faces = face_app.get(img)

    if len(faces) == 0:
        return {
            "success": False,
            "message": "No face detected"
        }

    if len(faces) > 1:
        return {
            "success": False,
            "message": "Multiple faces detected. Only one face must be present."
        }

    embedding = faces[0].embedding.tolist()

    os.makedirs("embeddings", exist_ok=True)

    with open(
        f"embeddings/{user_id}.json",
        "w"
    ) as f:
        json.dump(
            embedding,
            f
        )

    return {
        "success": True,
        "message": "Face enrolled successfully"
    }