from ultralytics import YOLO
import cv2

# Load YOLOv8 model with local weights
model = YOLO("yolov8n.pt")


def detect_prohibited_objects(image_path: str):
    """
    Detects cell phone, book, laptop, person using YOLOv8.
    Returns:
        dict: success status and unique list of detected objects.
    """
    try:
        results = model(image_path)
        detected = []

        target_classes = {"cell phone", "book", "laptop", "person"}

        for result in results:
            for box in result.boxes:
                cls_id = int(box.cls[0])
                label = model.names[cls_id]
                if label in target_classes:
                    detected.append(label)

        return {
            "success": True,
            "objects": list(set(detected))
        }
    except Exception as e:
        return {
            "success": False,
            "message": str(e),
            "objects": []
        }
