import cv2
import json
import os
import numpy as np

from insightface.app import FaceAnalysis

face_app = FaceAnalysis(
    name="buffalo_l",
    providers=["CPUExecutionProvider"]
)

face_app.prepare(
    ctx_id=0,
    det_size=(640, 640)
)


def get_embedding(image_path):
    img = cv2.imread(image_path)

    if img is None:
        return None, "Image not found"

    faces = face_app.get(img)

    if len(faces) == 0:
        return None, "No face detected"

    embedding = faces[0].embedding
    return embedding, None


def verify_face(image_path, user_id, threshold=0.35):
    saved_path = f"embeddings/{user_id}.json"

    if not os.path.exists(saved_path):
        return {
            "success": False,
            "message": "No enrolled face found for this user"
        }

    with open(saved_path, "r") as f:
        saved_embedding = np.array(json.load(f))

    current_embedding, error = get_embedding(image_path)

    if error:
        return {
            "success": False,
            "message": error
        }

    similarity = np.dot(saved_embedding, current_embedding) / (
        np.linalg.norm(saved_embedding) * np.linalg.norm(current_embedding)
    )

    is_match = similarity >= threshold

    return {
        "success": True,
        "match": bool(is_match),
        "similarity": float(similarity),
        "threshold": threshold,
        "message": "Face matched" if is_match else "Face not matched"
    }