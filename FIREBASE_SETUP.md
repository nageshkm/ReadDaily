# Firebase Setup Guide for ReadDaily PWA

Follow these steps to set up Firebase Cloud Messaging for push notifications:

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: `readdaily-pwa`
4. Enable Google Analytics (optional)
5. Create project

## 2. Add Web App

1. In your Firebase project dashboard, click the Web icon (</>)
2. Register app with nickname: `ReadDaily Web`
3. Don't check "Also set up Firebase Hosting"
4. Click "Register app"

## 3. Get Configuration

Copy the Firebase configuration object. It looks like this:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "readdaily-pwa.firebaseapp.com",
  projectId: "readdaily-pwa",
  storageBucket: "readdaily-pwa.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

## 4. Enable Cloud Messaging

1. In Firebase Console, go to "Cloud Messaging" from left sidebar
2. Click on "Web configuration" tab
3. Generate a new Web Push certificate (VAPID key)
4. Copy the key pair - you'll need the public key

## 5. Set Up Service Account (for server-side notifications)

1. Go to Project Settings > Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Extract these values from the JSON:
   - `project_id`
   - `private_key_id` 
   - `private_key`
   - `client_email`
   - `client_id`

## 6. Add Secrets to Replit

Add these environment variables to your Replit secrets:

### Client-side (Frontend) Secrets:
- `VITE_FIREBASE_API_KEY`: Your Firebase API key
- `VITE_FIREBASE_PROJECT_ID`: Your Firebase project ID
- `VITE_FIREBASE_APP_ID`: Your Firebase app ID
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: Your messaging sender ID
- `VITE_FIREBASE_VAPID_KEY`: Your Web Push certificate public key

### Server-side (Backend) Secrets:
- `FIREBASE_PROJECT_ID`: Your Firebase project ID
- `FIREBASE_PRIVATE_KEY_ID`: From service account JSON
- `FIREBASE_PRIVATE_KEY`: From service account JSON (keep the \n characters)
- `FIREBASE_CLIENT_EMAIL`: From service account JSON
- `FIREBASE_CLIENT_ID`: From service account JSON

## 7. Update Firebase Messaging Service Worker

Update the configuration in `public/firebase-messaging-sw.js` with your actual Firebase config values.

## 8. Test Notifications

1. Deploy your app
2. Sign in as a user
3. Grant notification permissions when prompted
4. Like an article from another user's account
5. Check if the notification appears

## Troubleshooting

- Make sure your domain is added to Firebase authorized domains
- Check browser console for any Firebase initialization errors
- Verify all environment variables are set correctly
- Ensure notification permissions are granted in browser settings

## Security Notes

- Never commit Firebase private keys to version control
- Use Replit secrets for all sensitive configuration
- Regularly rotate service account keys
- Monitor Firebase usage and quotas