# Firebase Setup Guide for Rockslist

To replicate the backend functionality for the Rockslist React app, follow these steps in your new Firebase Project.

## 1. Create Project
Go to [console.firebase.google.com](https://console.firebase.google.com/) and create a new project.

## 2. Enable Authentication
1. Go to **Authentication** > **Sign-in method**.
2. Enable **Google**.
3. Enable **Phone**.
   - Note: For testing, you may want to add "Phone numbers for testing" in the section below the providers.

## 3. Create Firestore Database
1. Go to **Firestore Database**.
2. Click **Create Database**.
3. Choose **Production mode** (or Test mode, but you'll need to update rules).
4. Select a location (e.g., `us-central1` or `asia-south1`).
5. **Rules**:
   The app assumes it can read/write to `lists` and `users`.
   *Minimal Rules for Development:*
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true; // WARNING: Publicly accessible
       }
     }
   }
   ```
   *Better Rules (Recommended):*
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

## 4. Enable Storage
1. Go to **Storage**.
2. Click **Get Started**.
3. **Rules**:
   Copy the following rules (based on the original project):
   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /{allPaths=**} {
         allow read, write: if true;
       }
     }
   }
   ```
   *Note: This allows public write access. Secure this in production.*

## 5. Configure CORS (Critical for Web Uploads)
If you are running the app on `localhost`, you must configure CORS for Firebase Storage, otherwise image uploads will fail.
1. Download `gsutil` or use the Google Cloud Console Command Line.
2. Create a file named `cors.json`:
   ```json
   [
     {
       "origin": ["http://localhost:5173", "http://localhost:3000", "https://your-domain.com"],
       "method": ["GET"],
       "maxAgeSeconds": 3600
     }
   ]
   ```
3. Run: `gsutil cors set cors.json gs://<YOUR_BUCKET_NAME>`

## 6. Update Environment Variables
Get your project config from **Project Settings** > **General** > **Your apps** > **SDK setup and configuration** > **Config**.
Update the `.env` file in `rockslist-react/` with the new values:
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```
