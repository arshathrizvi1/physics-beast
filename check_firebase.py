import os
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

# Initialize Firebase
cred_path = r'C:\Projects\Brilliant Academy\physics-beast\src\lib\service-account.json'
if not firebase_admin._apps:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()

# Check latest live_classes
classes = db.collection('live_classes').order_by('createdAt', direction=firestore.Query.DESCENDING).limit(3).get()
print("--- LATEST CLASSES ---")
for c in classes:
    print(c.id, c.to_dict().get('title'), c.to_dict().get('status'))

# Check latest notifications
notifs = db.collection('notifications').order_by('createdAt', direction=firestore.Query.DESCENDING).limit(3).get()
print("--- LATEST NOTIFICATIONS ---")
for n in notifs:
    print(n.id, n.to_dict().get('title'))

