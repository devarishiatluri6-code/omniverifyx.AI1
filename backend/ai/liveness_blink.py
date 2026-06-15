import cv2
import mediapipe as mp
import time

mp_face_mesh = mp.solutions.face_mesh

LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]


def eye_aspect_ratio(landmarks, eye_points, w, h):
    points = []

    for idx in eye_points:
        point = landmarks[idx]
        points.append((int(point.x * w), int(point.y * h)))

    vertical_1 = abs(points[1][1] - points[5][1])
    vertical_2 = abs(points[2][1] - points[4][1])
    horizontal = abs(points[0][0] - points[3][0])

    if horizontal == 0:
        return 0

    return (vertical_1 + vertical_2) / (2.0 * horizontal)


def draw_text_with_outline(img, text, pos, font, scale, color, thickness, outline_thickness=3):
    # Draw outline
    cv2.putText(img, text, pos, font, scale, (0, 0, 0), thickness + outline_thickness, cv2.LINE_AA)
    # Draw text
    cv2.putText(img, text, pos, font, scale, color, thickness, cv2.LINE_AA)


def run_blink_liveness(duration=15):
    try:
        cap = cv2.VideoCapture(0)

        if not cap.isOpened():
            return {
                "success": False,
                "live": False,
                "blink_count": 0,
                "head_left": False,
                "head_right": False,
                "center_returned": False,
                "message": "Camera not opening"
            }

        blink_count = 0
        eye_closed = False
        start_time = time.time()

        head_left = False
        head_right = False
        center_returned = False
        first_turn_ratio = None

        state = "STATE_CENTER_START"

        with mp_face_mesh.FaceMesh(
            max_num_faces=2,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        ) as face_mesh:

            while time.time() - start_time < duration:
                ret, frame = cap.read()

                if not ret:
                    continue

                h, w, _ = frame.shape
                # Flip the frame horizontally for a mirrored selfie view
                frame = cv2.flip(frame, 1)

                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = face_mesh.process(rgb)

                warning_text = None

                if not results.multi_face_landmarks:
                    warning_text = "No face detected"
                elif len(results.multi_face_landmarks) > 1:
                    warning_text = "Multiple faces detected!"
                else:
                    landmarks = results.multi_face_landmarks[0].landmark

                    # --- Eye aspect ratio blink detection ---
                    left_ear = eye_aspect_ratio(landmarks, LEFT_EYE, w, h)
                    right_ear = eye_aspect_ratio(landmarks, RIGHT_EYE, w, h)
                    avg_ear = (left_ear + right_ear) / 2

                    if avg_ear < 0.20:
                        eye_closed = True

                    if avg_ear > 0.25 and eye_closed:
                        blink_count += 1
                        eye_closed = False

                    # --- Head direction detection ---
                    x_nose = landmarks[4].x
                    x_left = landmarks[234].x
                    x_right = landmarks[454].x

                    x_min = min(x_left, x_right)
                    x_max = max(x_left, x_right)

                    d_left = x_nose - x_min
                    d_right = x_max - x_nose

                    if d_right == 0:
                        ratio = 999.0
                    else:
                        ratio = d_left / d_right

                    # --- Challenge state machine ---
                    if state == "STATE_CENTER_START":
                        if 0.7 <= ratio <= 1.4:
                            state = "STATE_BLINK"

                    elif state == "STATE_BLINK":
                        if blink_count >= 2:
                            state = "STATE_TURN_LEFT"

                    elif state == "STATE_TURN_LEFT":
                        if ratio < 0.55 or ratio > 1.8:
                            head_left = True
                            first_turn_ratio = ratio
                            state = "STATE_TURN_RIGHT"

                    elif state == "STATE_TURN_RIGHT":
                        if first_turn_ratio < 0.55:
                            if ratio > 1.8:
                                head_right = True
                                state = "STATE_RETURN_CENTER"
                        else:
                            if ratio < 0.55:
                                head_right = True
                                state = "STATE_RETURN_CENTER"

                    elif state == "STATE_RETURN_CENTER":
                        if 0.7 <= ratio <= 1.4:
                            center_returned = True
                            state = "STATE_SUCCESS"

                # --- Draw User Interface ---
                # Semi-transparent overlay at the top
                overlay = frame.copy()
                cv2.rectangle(overlay, (0, 0), (w, 80), (0, 0, 0), -1)
                cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)

                if warning_text:
                    draw_text_with_outline(frame, warning_text, (20, 45), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
                else:
                    if state == "STATE_CENTER_START":
                        curr_inst = "Look straight at the camera"
                    elif state == "STATE_BLINK":
                        curr_inst = "Blink twice"
                    elif state == "STATE_TURN_LEFT":
                        curr_inst = "Turn head left"
                    elif state == "STATE_TURN_RIGHT":
                        curr_inst = "Turn head right"
                    elif state == "STATE_RETURN_CENTER":
                        curr_inst = "Return to center"
                    else:
                        curr_inst = "Liveness challenge passed!"
                    
                    draw_text_with_outline(frame, curr_inst, (20, 45), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

                # Draw time remaining
                time_left = max(0.0, duration - (time.time() - start_time))
                time_text = f"Time: {time_left:.1f}s"
                draw_text_with_outline(frame, time_text, (w - 180, 45), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)

                # Semi-transparent status panel at the bottom
                status_overlay = frame.copy()
                cv2.rectangle(status_overlay, (0, h - 100), (w, h), (0, 0, 0), -1)
                cv2.addWeighted(status_overlay, 0.6, frame, 0.4, 0, frame)

                # Check status
                blink_status = f"Blinks: {blink_count}/2"
                left_status = "Head Left: " + ("OK" if head_left else "Pending")
                right_status = "Head Right: " + ("OK" if head_right else "Pending")
                center_status = "Center: " + ("OK" if center_returned else "Pending")

                draw_text_with_outline(frame, blink_status, (20, h - 70), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0) if blink_count >= 2 else (255, 255, 255), 1)
                draw_text_with_outline(frame, left_status, (20, h - 40), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0) if head_left else (255, 255, 255), 1)
                draw_text_with_outline(frame, right_status, (240, h - 70), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0) if head_right else (255, 255, 255), 1)
                draw_text_with_outline(frame, center_status, (240, h - 40), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0) if center_returned else (255, 255, 255), 1)

                cv2.imshow("Liveness Challenge Verification", frame)

                if state == "STATE_SUCCESS":
                    break

                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break

        cap.release()
        cv2.destroyAllWindows()

        is_live = (blink_count >= 2 and head_left and head_right and center_returned)

        if is_live:
            return {
                "success": True,
                "live": True,
                "blink_count": blink_count,
                "head_left": True,
                "head_right": True,
                "center_returned": True,
                "message": "Challenge-based liveness passed"
            }
        else:
            reasons = []
            if blink_count < 2:
                reasons.append(f"blink count {blink_count}/2")
            if not head_left:
                reasons.append("head turn left pending")
            if not head_right:
                reasons.append("head turn right pending")
            if not center_returned:
                reasons.append("return to center pending")
            
            reason_msg = ", ".join(reasons)
            return {
                "success": True,
                "live": False,
                "blink_count": blink_count,
                "head_left": head_left,
                "head_right": head_right,
                "center_returned": center_returned,
                "message": f"Liveness verification failed: {reason_msg}"
            }

    except Exception as e:
        if 'cap' in locals() and cap.isOpened():
            cap.release()
        cv2.destroyAllWindows()
        return {
            "success": False,
            "live": False,
            "blink_count": 0,
            "head_left": False,
            "head_right": False,
            "center_returned": False,
            "message": f"Liveness error: {str(e)}"
        }