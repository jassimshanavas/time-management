# Firebase Setup Guide for TimeFlow

This guide will help you set up Firebase for TimeFlow to replace localStorage with a real database.

## 📋 Prerequisites

- Google account
- Node.js installed
- TimeFlow project cloned

## 🚀 Step-by-Step Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: `timeflow-app` (or your preferred name)
4. (Optional) Enable Google Analytics
5. Click **"Create project"**
6. Wait for project creation to complete

### 2. Register Web App

1. In your Firebase project, click the **Web icon** (`</>`) to add a web app
2. Enter app nickname: `TimeFlow Web`
3. **Check** "Also set up Firebase Hosting" (optional)
4. Click **"Register app"**
5. **Copy the firebaseConfig object** - you'll need this!

Example config:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "timeflow-app.firebaseapp.com",
  projectId: "timeflow-app",
  storageBucket: "timeflow-app.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

### 3. Enable Firestore Database

1. In Firebase Console, go to **"Build" → "Firestore Database"**
2. Click **"Create database"**
3. Select **"Start in production mode"** (we'll configure rules next)
4. Choose a location (select closest to your users)
5. Click **"Enable"**

### 4. Configure Firestore Security Rules

1. Go to **"Firestore Database" → "Rules"** tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Tasks collection
    match /tasks/{taskId} {
      allow read, delete: if isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
      allow update: if isAuthenticated() && isOwner(resource.data.userId);
    }
    
    // Reminders collection
    match /reminders/{reminderId} {
      allow read, delete: if isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
      allow update: if isAuthenticated() && isOwner(resource.data.userId);
    }
    
    // Notes collection
    match /notes/{noteId} {
      allow read, delete: if isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
      allow update: if isAuthenticated() && isOwner(resource.data.userId);
    }
    
    // Goals collection
    match /goals/{goalId} {
      allow read, delete: if isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
      allow update: if isAuthenticated() && isOwner(resource.data.userId);
    }
    
    // Habits collection
    match /habits/{habitId} {
      allow read, delete: if isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
      allow update: if isAuthenticated() && isOwner(resource.data.userId);
    }
    
    // Time Entries collection
    match /timeEntries/{entryId} {
      allow read, delete: if isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
      allow update: if isAuthenticated() && isOwner(resource.data.userId);
    }
    
    // Users collection
    match /users/{userId} {
      allow read, write: if isOwner(userId);
    }
    
    // Settings collection
    match /settings/{userId} {
      allow read, write: if isOwner(userId);
    }
  }
}
```

3. Click **"Publish"**

### 5. Enable Authentication

1. Go to **"Build" → "Authentication"**
2. Click **"Get started"**

#### Enable Email/Password:
3. Click on **"Email/Password"** provider
4. **Enable** the first option (Email/Password)
5. Click **"Save"**

#### Enable Google Sign-In:
6. Click on **"Google"** provider
7. **Enable** the toggle
8. Enter a **Project support email** (your email)
9. Click **"Save"**

**Note:** Google Sign-In works automatically - no additional configuration needed!

### 6. Configure Environment Variables

1. In your project root, create `.env.local` file:

```bash
# Copy from env.example
cp env.example .env.local
```

2. Open `.env.local` and fill in your Firebase config values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=timeflow-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=timeflow-app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=timeflow-app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

3. **Important:** Never commit `.env.local` to git! It's already in `.gitignore`.

### 7. Create Firestore Indexes (Optional but Recommended)

For better query performance, create indexes:

1. Go to **"Firestore Database" → "Indexes"** tab
2. Click **"Create index"**
3. Create these composite indexes:

**Tasks Index:**
- Collection: `tasks`
- Fields: `userId` (Ascending), `createdAt` (Descending)

**Reminders Index:**
- Collection: `reminders`
- Fields: `userId` (Ascending), `dueDate` (Ascending)

**Time Entries Index:**
- Collection: `timeEntries`
- Fields: `userId` (Ascending), `startTime` (Descending)

### 8. Test the Connection

1. Restart your development server:
```bash
npm run dev
```

2. Open the app in your browser
3. Try to register a new account
4. Check Firebase Console → Authentication to see if user was created
5. Try creating a task
6. Check Firebase Console → Firestore Database to see if data was saved

## 🔒 Security Best Practices

### 1. Protect Your API Keys
- Never commit `.env.local` to version control
- Use environment variables for all sensitive data
- Rotate keys if accidentally exposed

### 2. Configure App Check (Optional but Recommended)
1. Go to **"Build" → "App Check"**
2. Register your app
3. Enable reCAPTCHA v3
4. This prevents unauthorized access to your Firebase resources

### 3. Set Up Budget Alerts
1. Go to **"Project Settings" → "Usage and billing"**
2. Set up budget alerts
3. Monitor usage regularly

### 4. Enable Backup (Recommended)
1. Go to **"Firestore Database" → "Backups"**
2. Enable automated backups
3. Choose backup frequency

## 📊 Firestore Data Structure

Your data will be organized in these collections:

```
firestore
├── users
│   └── {userId}
│       ├── name: string
│       ├── email: string
│       └── avatar: string
├── settings
│   └── {userId}
│       ├── theme: string
│       ├── notifications: boolean
│       └── soundEffects: boolean
├── tasks
│   └── {taskId}
│       ├── userId: string
│       ├── title: string
│       ├── description: string
│       ├── status: string
│       ├── priority: string
│       ├── deadline: timestamp
│       ├── createdAt: timestamp
│       └── updatedAt: timestamp
├── reminders
│   └── {reminderId}
│       ├── userId: string
│       ├── title: string
│       ├── description: string
│       ├── dueDate: timestamp
│       ├── completed: boolean
│       └── createdAt: timestamp
├── notes
│   └── {noteId}
│       ├── userId: string
│       ├── title: string
│       ├── content: string
│       ├── tags: array
│       ├── pinned: boolean
│       ├── createdAt: timestamp
│       └── updatedAt: timestamp
├── goals
│   └── {goalId}
│       ├── userId: string
│       ├── title: string
│       ├── description: string
│       ├── progress: number
│       ├── targetDate: timestamp
│       ├── milestones: array
│       └── createdAt: timestamp
├── habits
│   └── {habitId}
│       ├── userId: string
│       ├── title: string
│       ├── description: string
│       ├── frequency: string
│       ├── completedDates: array
│       ├── currentStreak: number
│       ├── longestStreak: number
│       └── createdAt: timestamp
└── timeEntries
    └── {entryId}
        ├── userId: string
        ├── category: string
        ├── description: string
        ├── startTime: timestamp
        ├── endTime: timestamp
        ├── duration: number
        └── isRunning: boolean
```

## 🐛 Troubleshooting

### Error: "Firebase: Error (auth/configuration-not-found)"
**Solution:** Make sure `.env.local` file exists and contains all required variables.

### Error: "Missing or insufficient permissions"
**Solution:** Check Firestore security rules are properly configured.

### Error: "Firebase: Firebase App named '[DEFAULT]' already exists"
**Solution:** This is normal during hot reload in development. Ignore it.

### Data not syncing
**Solution:** 
1. Check browser console for errors
2. Verify Firebase config in `.env.local`
3. Check Firestore rules allow your operations
4. Ensure user is authenticated

### Authentication not working
**Solution:**
1. Verify Email/Password provider is enabled in Firebase Console
2. Check network tab for failed requests
3. Ensure API key is correct

## 📈 Monitoring & Analytics

### View Usage
1. Go to **"Project Settings" → "Usage and billing"**
2. Monitor:
   - Document reads/writes
   - Storage usage
   - Authentication requests

### Free Tier Limits
- **Firestore:** 50K reads, 20K writes, 20K deletes per day
- **Authentication:** Unlimited
- **Storage:** 1 GB

### Upgrade if Needed
If you exceed free tier limits:
1. Go to **"Project Settings" → "Usage and billing"**
2. Click **"Modify plan"**
3. Choose **"Blaze (Pay as you go)"**

## 🎉 You're All Set!

Your TimeFlow app is now connected to Firebase! 

**Next Steps:**
1. Test all features (tasks, reminders, notes, etc.)
2. Invite team members if needed
3. Set up backups
4. Monitor usage
5. Deploy to production

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firebase Pricing](https://firebase.google.com/pricing)

---

**Need Help?** Check the [Firebase Support](https://firebase.google.com/support) page.
