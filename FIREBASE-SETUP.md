# Firebase Database Setup Guide

Step-by-step guide to replicate the exact Firebase configuration for this project.

---

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name: `lilbee-logic` (or your preferred name)
4. Disable Google Analytics (optional)
5. Click **"Create project"**

---

## 2. Enable Realtime Database

1. In Firebase Console, click **"Build"** → **"Realtime Database"**
2. Click **"Create Database"**
3. Select a location (e.g., `us-central1`)
4. Choose **"Start in locked mode"**
5. Click **"Enable"**

---

## 3. Configure Security Rules

Go to **Realtime Database** → **Rules** tab and paste:

```json
{
  "rules": {
    "users": {
      ".indexOn": ["email"],
      "$uid": {
        ".read": "$uid === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'admin'",
        ".write": "$uid === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'admin'"
      }
    },
    "posts": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('users').child(auth.uid).child('isBanned').val() !== true"
    },
    "requests": {
      ".indexOn": ["uid", "timestamp"],
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "chat": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

Click **"Publish"**

**What these rules do:**
- `users`: Users can only access their own data; admins can access all
- `posts`: Authenticated users can read/write; banned users can't post
- `requests` & `chat`: All authenticated users have access
- Indexes on `email`, `uid`, `timestamp` for better query performance

---

## 4. Enable Authentication

1. Go to **Build** → **Authentication**
2. Click **"Get started"**
3. Click **"Email/Password"** in Sign-in providers
4. Toggle **"Email/Password"** to **Enabled**
5. Click **"Save"**

---

## 5. Get Service Account Credentials

1. Click **⚙️ (Settings)** → **"Project settings"**
2. Go to **"Service accounts"** tab
3. Click **"Generate new private key"**
4. Click **"Generate key"** (downloads JSON file)
5. Save this file securely - contains sensitive credentials

---

## 6. Database Structure

Your database will have this structure:

```
lilbee-logic-default-rtdb/
├── users/
│   └── {uid}/
│       ├── uid: string
│       ├── email: string
│       ├── name: string
│       ├── phone: string
│       ├── role: "user" | "admin"
│       ├── avatar: string
│       ├── isBanned: boolean
│       └── joinedAt: timestamp
├── posts/
│   └── {postId}/
│       ├── id: string
│       ├── uid: string
│       ├── email: string
│       ├── content: string
│       └── timestamp: timestamp
├── requests/
│   └── {requestId}/
│       ├── id: string
│       ├── uid: string
│       ├── type: string
│       ├── desc: string
│       ├── status: "pending" | "approved" | "rejected"
│       └── timestamp: timestamp
└── chat/
    └── {messageId}/
        ├── id: string
        ├── uid: string
        ├── email: string
        ├── msg: string
        └── timestamp: timestamp
```

---

## 7. Environment Variables

Create `.env` file in your project with credentials from the JSON file:

```env
FIREBASE_PROJECT_ID=lilbee-logic
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-key-here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@lilbee-logic.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40lilbee-logic.iam.gserviceaccount.com
```

---

## 8. Migrate Data (Optional)

If you have existing data in `db.json`, run:

```bash
node migrate-to-firebase.js
```

This transfers all users, posts, requests, and chat messages to Firebase.

---

## Verification

1. Start your server: `npm run dev`
2. Check console for: `✅ Firebase Realtime Database initialized successfully`
3. Test signup at: `http://localhost:3000/signup.html`
4. Verify data in Firebase Console → Realtime Database → Data tab

---

## Free Tier Limits

Your setup stays free with these limits:
- **1 GB** stored data
- **10 GB/month** bandwidth
- **100 simultaneous connections**

Perfect for development and small-to-medium production apps! 🎉
