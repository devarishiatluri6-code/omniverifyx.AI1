from ultralytics import YOLO
import cv2

model = YOLO("yolov8n.pt")


def detect_prohibited_objects(image_path):
    results = model(image_path)

    detected = []

    prohibited = [
        "cell phone",
        "book",
        "laptop",
        "tablet",
        "person"
    ]

    for result in results:
        for box in result.boxes:

            cls_id = int(box.cls[0])

            label = model.names[cls_id]

            if label in prohibited:
                detected.append(label)

    return {
        "success": True,
        "objects": list(set(detected))
    }