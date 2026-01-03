# Firebase Setup Guide [DEPRECATED]

## ⚠️ DEPRECATION NOTICE

**Firebase has been completely removed from Shalgalt as of January 4, 2026.**

The application now uses **MongoDB Atlas** as the primary backend for all persistent data. This provides better cost efficiency, flexibility, and scaling.

**See `MONGODB_SETUP.md` for current setup instructions.**

---

## Historical Reference (No Longer In Use)

The following information is kept for reference only. Firebase is no longer part of the codebase.

---

## Local Setup (Development)

### 1. Create a Service Account for the Backend

1. Go to [Firebase Console](https://console.firebase.google.com/) → Select **satmath-5c66b** project
2. Click the **⚙️ Settings** (gear icon) in the top-left → **Project Settings**
3. Click the **Service Accounts** tab
4. Under "Firebase Admin SDK", click **Generate New Private Key**
5. A JSON file will download. It looks like:
   ```json
   {
     "type": "service_account",
     "project_id": "satmath-5c66b",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "firebase-adminsdk-xyz@satmath-5c66b.iam.gserviceaccount.com",
     "client_id": "...",
     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
     "token_uri": "https://oauth2.googleapis.com/token",
     ...
   }
   ```

### 2. Add to Your `.env` File (Local)

Open `.env` in the project root and add:

```env
USE_FIREBASE=true
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"satmath-5c66b",...}
```

**Important**: Paste the entire JSON as a **single line** (remove all newlines and tabs). You can use an online JSON minifier if needed.

Example (simplified):
```env
USE_FIREBASE=true
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"satmath-5c66b","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBA...","client_email":"firebase-adminsdk-xyz@satmath-5c66b.iam.gserviceaccount.com","client_id":"123456","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/..."}
FIREBASE_PROJECT_ID=satmath-5c66b
```

### 3. Test Locally

```bash
cd /Users/mac/Documents/Shalgalt
npm install  # Installs firebase-admin
npm start    # Starts Express server on port 3000
```

Visit http://localhost:3000 and try registering a user. It should save to **Firestore** instead of JSON.

Verify in Firebase Console:
1. Go to **Firestore Database** tab
2. You should see a `users` collection with a document per registered user

---

## Netlify Deployment

### 1. Add Environment Variables in Netlify

1. Go to Netlify Dashboard → Your Site → **Site settings** → **Build & deploy** → **Environment**
2. Click **Add environment variable** and add:

   **Variable name**: `USE_FIREBASE`  
   **Value**: `true`

3. Click **Add environment variable** again for the service account:

   **Variable name**: `FIREBASE_SERVICE_ACCOUNT`  
   **Value**: Paste your entire service account JSON (as a single line)

4. Optionally add:

   **Variable name**: `FIREBASE_PROJECT_ID`  
   **Value**: `satmath-5c66b`

5. **Redeploy** your site (trigger from Git push or manual deploy in Netlify)

### 2. Verify on Netlify

After deploy, test registration at your live URL (e.g., `https://your-site.netlify.app`). Check Firestore in Firebase Console for new user documents.

---

## Firestore Security Rules (Recommended)

To restrict access, set Firestore rules in **Firebase Console** → **Firestore Database** → **Rules** tab:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow service account (backend) to read/write everything
    // Users cannot directly access (only via your API)
    match /{document=**} {
      allow read, write: if request.auth.uid != null;
    }
  }
}
```

For now, you can also use **default rules** (more permissive) if you're testing.

---

## What's Stored in Firestore vs. JSON

| Data Type       | Storage     | Notes |
|-----------------|------------|-------|
| Users           | Firestore  | When `USE_FIREBASE=true` |
| Questions       | JSON file  | Still file-based |
| Test Results    | JSON file  | Still file-based |
| Answers         | JSON file  | Still file-based |

You can extend to Firestore for tests/answers later if needed.

---

## Troubleshooting

### Error: "Firebase Admin SDK is not installed or failed to initialize"
- Run `npm install firebase-admin` in the project
- Ensure `FIREBASE_SERVICE_ACCOUNT` is set and valid JSON

### Error: "Firestore not initialized"
- Double-check that `USE_FIREBASE=true` is set
- Verify the service account JSON is a single-line string (no newlines)

### Users not appearing in Firestore
- Check Netlify build logs for errors
- Verify the service account email has **Editor** role in Firebase IAM
- Check Firestore rules allow writes from the service account

### Local testing doesn't use Firestore
- Ensure `.env` has `USE_FIREBASE=true`
- Restart the server after changing `.env`

---

## Next Steps

1. **Enable in Netlify**: Follow steps above to add environment variables
2. **Test registration**: Try signing up and verify users appear in Firestore
3. **Extend to tests**: If you want tests/answers in Firestore too, let me know and I'll update the proxy store

---

**Your Firebase Config (Safe to Commit)**
```javascript
// src/firebase-config.js contains your web API key and project details
// This is intentionally public (API key is restricted in Firebase Console)
```
