import cv2
import numpy as np
from dotenv import load_dotenv
load_dotenv()
import os
from roboflow import Roboflow




def detect_foam_line(grayscale_image, x1, y1, y2):
    """
    Detect the foam line by analyzing a narrow column down the middle of the ROI.

    Args:
    - grayscale_image: Grayscale image of the bounding box containing the "G".
    - original_image: Original grayscale image for accessing pixels outside the ROI.
    - x1: X-coordinate of the left side of the ROI.
    - y1: Y-coordinate of the top of the ROI.
    - y2: Y-coordinate of the bottom of the ROI.

    Returns:
    - foam_line_y: Y-coordinate of the foam line within the cropped ROI.
    """
    height, width = grayscale_image.shape
    center_x = width // 2

    # Define the 5-pixel-wide column around the center
    column_start = max(center_x - 2, 0)
    column_end = min(center_x + 3, width)

    # Extract the 5-pixel-wide column in the middle of the ROI
    narrow_column = grayscale_image[:, column_start:column_end]

    # Save the narrow column for debugging
    cv2.imwrite("narrow_column_debug.jpg", narrow_column)

    # Apply Gaussian Blur to smooth out noise
    blurred_column = cv2.GaussianBlur(narrow_column, (3, 3), 0)

    # Apply Otsu's thresholding to dynamically binarize the image
    _, binary_column = cv2.threshold(blurred_column, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Save the binary column for debugging
    cv2.imwrite("binary_column_debug.jpg", binary_column)

    # Calculate the vertical intensity profile (average across the 5-pixel width)
    binary_profile = np.mean(binary_column, axis=1)
    print("Binary Profile:", binary_profile)

    # Detect transition: Find where the change in intensity is the biggest
    gradient = np.abs(np.diff(binary_profile))
    foam_line_y = int(np.argmax(gradient)) + y1  # Offset by y1 to convert to global coordinates

    return foam_line_y

def calculate_foam_score(foam_line_y, g_top, g_bottom):
    """
    Calculate a score based on how close the foam line is to the center of the "G" bounding box.

    Args:
    - foam_line_y: Y-coordinate of the detected foam line.
    - g_top: Y-coordinate of the top of the G's bounding box.
    - g_bottom: Y-coordinate of the bottom of the G's bounding box.

    Returns:
    - score: A float score indicating proximity of the foam line to the center of the G.
    """
    g_center_y = (g_top + g_bottom) // 2

    # Calculate the distance between the foam line and the center
    distance = abs(foam_line_y - g_center_y)

    # Normalize the score: closer to center = higher score
    g_height = g_bottom - g_top
    score = max(0, 1 - (distance / (g_height / 2)))  # Normalize within [0, 1]

    print(f"Foam Line Y: {foam_line_y}, G Center Y: {g_center_y}, Score: {score:.2f}")
    return score

def run_robo_flow(image_path, image_url, robo_api_key):
    rf = Roboflow(api_key=robo_api_key)
    project = rf.workspace().project("findtheg")
    model = project.version(1).model

    # Infer on a local image
    predictions = model.predict(image_url, confidence=40, overlap=30, hosted=True).json()

    image = cv2.imread(image_path)
    if image is None:
        raise ValueError("Invalid image format")

    # Extract the bounding box for the "G"
    for prediction in predictions['predictions']:
        if prediction['class'] == 'G_logo':  # Ensure it's the "G"
            x1 = int(prediction['x'] - prediction['width'] / 2)
            y1 = int(prediction['y'] - prediction['height'] / 2)
            x2 = int(prediction['x'] + prediction['width'] / 2)
            y2 = int(prediction['y'] + prediction['height'] / 2)
            print(f"G bounding box: ({x1}, {y1}), ({x2}, {y2})")

            # Crop the "G" region
            roi = image[y1:y2, x1:x2]  # Region of interest (the G)
            
            # Save the ROI (Region of Interest) to an image for debugging
            cv2.imwrite("roi_debug.jpg", roi)

            # Detect the foam line in the cropped region
            foam_line_y = detect_foam_line(
                cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY),  # Cropped grayscale ROI
                x1,  # X-coordinate of the left edge of ROI
                y1,  # Y-coordinate of the top of ROI
                y2   # Y-coordinate of the bottom of ROI
            )
            if foam_line_y is not None:
                # Calculate the center of the "G"
                g_center_y = (y1 + y2) // 2
                print(f"Foam Line Y: {foam_line_y}, G Center Y: {g_center_y}")

                # Draw the foam line on the original image in bold red
                cv2.line(image, (x1, foam_line_y), (x2, foam_line_y), (0, 0, 255), 3)
                cv2.putText(image, "Foam Line", (x1, foam_line_y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

                # Draw the G center line on the original image in bold green
                cv2.line(image, (x1, g_center_y), (x2, g_center_y), (0, 255, 0), 3)
                cv2.putText(image, "G Center", (x1, g_center_y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

                # Save the image with the lines for debugging
                cv2.imwrite("image_with_lines.jpg", image)

                # Calculate the distance
                distance = abs(foam_line_y - g_center_y)
                print(f"Distance from foam line to center of G: {distance}")

                # # Draw the foam line on the original image
                # cv2.line(image, (x1, foam_line_y + y1), (x2, foam_line_y + y1), (255, 0, 0), 2)
                # cv2.putText(image, "Foam Line", (x1, foam_line_y + y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)

                score = calculate_foam_score(foam_line_y, y1, y2)
                print('score of guiness in functions')
                print(score)
                return {
                    "status": "success",
                    "score": score
                }
            else:
                print("Foam line not detected.")
                raise ValueError("No foam line detected")            
    raise ValueError("G_logo not detected in the image.")


