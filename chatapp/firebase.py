import os
import firebase_admin
from firebase_admin import credentials
from django.conf import settings

def initialize_firebase():
    """
    Initializes the Firebase Admin SDK if not already initialized.
    Assumes `serviceAccountKey.json` is located in the root project directory.
    """
    if not firebase_admin._apps:
        # Path to your service account key file
        cred_path = os.path.join(settings.BASE_DIR, 'serviceAccountKey.json')
        
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK initialized.")
        else:
            print(f"Warning: Firebase Admin SDK credentials not found at {cred_path}")

# Initialize when this module is imported
initialize_firebase()
