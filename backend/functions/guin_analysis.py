import cv2
import numpy as np
from dotenv import load_dotenv
load_dotenv()
import os
from roboflow import Roboflow




def detect_foam_line(grayscale_image):
    """
    Detect the foam line by analyzing a narrow column of the leftmost part of the ROI,
    and applying dynamic thresholding for better contrast.

    Args:
    - grayscale_image: Cropped grayscale image of the bounding box containing the "G".

    Returns:
    - foam_line_y: Y-coordinate of the foam line within the cropped ROI.
    """
    height, width = grayscale_image.shape

    # Focus on a narrow 2-pixel-wide column on the rightmost part of the ROI
    narrow_column = grayscale_image[:, -5:]  # Take only the first 2 pixels (columns)

    # Apply Gaussian Blur to smooth out noise
    blurred_column = cv2.GaussianBlur(narrow_column, (3, 3), 0)

    # Apply Otsu's thresholding to dynamically binarize the image
    _, binary_column = cv2.threshold(blurred_column, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Save the binary column for debugging
    cv2.imwrite("binary_column_debug.jpg", binary_column)

    # Sum along the 2 columns to create a single-column binary profile
    binary_profile = np.mean(binary_column, axis=1)
    print("Binary Profile:", binary_profile)


    # Detect transition: Find where the change in intensity is the biggest
    gradient = np.abs(np.diff(binary_profile))
    foam_line_y = int(np.argmax(gradient))  # Find the row with the maximum intensity change

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

def run_robo_flow(image_path, robo_api_key):
    rf = Roboflow(api_key=robo_api_key)
    project = rf.workspace().project("findtheg")
    model = project.version(1).model

    # Infer on a local image
    predictions = model.predict(image_path, confidence=40, overlap=30).json()

    # Load the original image for visualization
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

            # Detect the foam line in the cropped region
            foam_line_y = detect_foam_line(cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY))
            if foam_line_y is not None:
                # Calculate the center of the "G"
                g_center_y = (y1 + y2) // 2
                print(f"Foam Line Y: {foam_line_y}, G Center Y: {g_center_y}")

                # Calculate the distance
                distance = abs(foam_line_y - g_center_y)
                print(f"Distance from foam line to center of G: {distance}")

                # # Draw the foam line on the original image
                # cv2.line(image, (x1, foam_line_y + y1), (x2, foam_line_y + y1), (255, 0, 0), 2)
                # cv2.putText(image, "Foam Line", (x1, foam_line_y + y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)

                score = calculate_foam_score(foam_line_y + y1, y1, y2)
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


