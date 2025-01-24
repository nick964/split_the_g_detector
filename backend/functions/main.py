# Welcome to Cloud Functions for Firebase for Python!
# To get started, simply uncomment the below code or create your own.
# Deploy with `firebase deploy`
from dotenv import load_dotenv
load_dotenv()
import os
os.environ["HOME"] = os.getenv("HOME", "/tmp")

from firebase_functions import https_fn
from firebase_functions.params import  StringParam
from firebase_admin import initialize_app
from pydantic import BaseModel
import requests
import tempfile
import flask
from guin_analysis import run_robo_flow
import json

initialize_app()
app = flask.Flask(__name__)

API_KEY = StringParam("API_KEY")
ROBO_FLOW_API_KEY = StringParam("ROBOFLOW_API_KEY")


@https_fn.on_request()
def analyze_image(req: https_fn.Request) -> https_fn.Response:
    try:
        incoming_api_key = req.headers.get("API-Key")
        if incoming_api_key != API_KEY.value:
            return https_fn.Response("Unauthorized: Invalid or missing API_Key", status=401)
        
        request_data = req.get_json()
        if not request_data or "url" not in request_data:
            return https_fn.Response("Missing 'url' in request payload", status=400)

        # Download the image from the URL
        image_url = request_data["url"]
        response = requests.get(image_url, stream=True)
        response.raise_for_status()

        # Save the image to a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            tmp.write(response.content)
            tmp_path = tmp.name

        # Analyze the image using `run_robo_flow`
        result = run_robo_flow(tmp_path, image_url, ROBO_FLOW_API_KEY.value)
        print('printing response in controller')
        print(result)

        # Clean up temporary file
        import os
        os.remove(tmp_path)
        my_response = { "status": "success", "score": result["score"], "processedUrl": result["processed_image_url"], "letterGrade": result["letter_grade"]}

        return https_fn.Response(json.dumps(my_response), status=200, headers={"Content-Type": "application/json"})


    except requests.exceptions.RequestException as e:
        return https_fn.Response(f"Error fetching image: {e}", status=400)
    except ValueError as e:
        return https_fn.Response(f"Error analyzing image: {e}", status=400)
    except Exception as e:
        return https_fn.Response(f"Unexpected error: {e}", status=500)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
