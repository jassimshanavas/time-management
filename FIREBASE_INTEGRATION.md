# Firebase Integration - Implementation Guide

## ✅ What's Been Set Up

### 1. **Firebase SDK Installed**
```bash
npm install firebase
```

### 2. **Files Created**

#### `lib/firebase.ts`
- Firebase app initialization
- Authentication instance
- Firestore database instance
- Configured to use environment variables

#### `lib/firebase-service.ts`
- Complete CRUD operations for all data types
- Functions for:
  - Tasks (getTasks, addTask, updateTask, deleteTask)
  - Reminders (getReminders, addReminder, updateReminder, deleteReminder)
  - Notes (getNotes, addNote, updateNote, deleteNote)
  - Goals (getGoals, addGoal, updateGoal, deleteGoal)
  - Habits (getHabits, addHabit, updateHabit, deleteHabit)
  - Time Entries (getTimeEntries, addTimeEntry, updateTimeEntry, deleteTimeEntry)
  - User & Settings (getUser, updateUser, getSettings, updateSettings)
  - Bulk operations (clearAllData, exportAllData)

#### `lib/auth-context.tsx`
- React Context for authentication
- Custom `useAuth()` hook
- Functions:
  - `signUp(email, password, name)` - Register new user
  - `signIn(email, password)` - Login existing user
  - `logout()` - Sign out
  - `resetPassword(email)` - Send password reset email
- Automatic user state management
- Firestore user document creation

#### `FIREBASE_SETUP.md`
- Complete step-by-step setup guide
- Security rules configuration
- Firestore structure documentation
- Troubleshooting tips

### 3. **Environment Configuration**
- Updated `env.example` with Firebase variables
- Instructions for creating `.env.local`

## 🔄 Next Steps to Complete Integration

### Step 1: Set Up Firebase Project

Follow the instructions in `FIREBASE_SETUP.md`:
1. Create Firebase project
2. Enable Firestore
3. Enable Authentication (Email/Password)
4. Configure security rules
5. Copy config to `.env.local`

### Step 2: Update Zustand Store

The current store uses localStorage. You need to:

1. **Modify `lib/store.ts`** to use Firebase functions instead of localStorage
2. **Add authentication state** from `useAuth()` hook
3. **Replace localStorage calls** with Firebase service calls

Example changes needed:

```typescript
// Before (localStorage)
addTask: (task) => {
  set((state) => ({
    tasks: [...state.tasks, task],
  }));
},

// After (Firebase)
addTask: async (task) => {
  const userId = useAuth().user?.uid;
  if (!userId) return;
  
  const taskId = await addTask(userId, task);
  set((state) => ({
    tasks: [...state.tasks, { ...task, id: taskId }],
  }));
},
```

### Step 3: Wrap App with AuthProvider

Update `app/layout.tsx`:

```typescript
import { AuthProvider } from '@/lib/auth-context';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

### Step 4: Update Authentication Pages

Modify `app/auth/login/page.tsx` and `app/auth/register/page.tsx` to use real Firebase auth:

```typescript
import { useAuth } from '@/lib/auth-context';

// In login page
const { signIn } = useAuth();
await signIn(email, password);

// In register page
const { signUp } = useAuth();
await signUp(email, password, name);
```

### Step 5: Add Protected Routes

Create `components/protected-route.tsx`:

```typescript
'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
```

### Step 6: Load Data on App Start

Update pages to load data from Firebase:

```typescript
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getTasks } from '@/lib/firebase-service';
import { useStore } from '@/lib/store';

export default function TasksPage() {
  const { user } = useAuth();
  const { tasks, setTasks } = useStore();

  useEffect(() => {
    if (user) {
      getTasks(user.uid).then(setTasks);
    }
  }, [user]);

  // Rest of component...
}
```

### Step 7: Update All CRUD Operations

Replace all localStorage operations with Firebase calls in:
- `app/tasks/page.tsx`
- `app/reminders/page.tsx`
- `app/notes/page.tsx`
- `app/goals/page.tsx`
- `app/habits/page.tsx`
- `app/time-tracking/page.tsx`
- `app/settings/page.tsx`

## 📋 Migration Checklist

- [ ] Create Firebase project
- [ ] Enable Firestore Database
- [ ] Enable Email/Password Authentication
- [ ] Configure Firestore security rules
- [ ] Create `.env.local` with Firebase config
- [ ] Update `lib/store.ts` to use Firebase
- [ ] Wrap app with `AuthProvider`
- [ ] Update login page to use Firebase auth
- [ ] Update register page to use Firebase auth
- [ ] Add protected routes
- [ ] Update all pages to load data from Firebase
- [ ] Update all CRUD operations to use Firebase
- [ ] Test authentication flow
- [ ] Test data persistence
- [ ] Remove localStorage code
- [ ] Test offline behavior (optional)

## 🔧 Code Examples

### Example: Updated Store with Firebase

```typescript
import { create } from 'zustand';
import * as firebaseService from './firebase-service';

interface StoreState {
  tasks: Task[];
  userId: string | null;
  setUserId: (id: string | null) => void;
  loadTasks: () => Promise<void>;
  addTask: (task: Omit<Task, 'id'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
  tasks: [],
  userId: null,
  
  setUserId: (id) => set({ userId: id }),
  
  loadTasks: async () => {
    const userId = get().userId;
    if (!userId) return;
    const tasks = await firebaseService.getTasks(userId);
    set({ tasks });
  },
  
  addTask: async (task) => {
    const userId = get().userId;
    if (!userId) return;
    const taskId = await firebaseService.addTask(userId, task);
    set((state) => ({
      tasks: [...state.tasks, { ...task, id: taskId }],
    }));
  },
  
  updateTask: async (id, updates) => {
    await firebaseService.updateTask(id, updates);
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  },
  
  deleteTask: async (id) => {
    await firebaseService.deleteTask(id);
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));
  },
}));
```

### Example: Protected Page Component

```typescript
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { setUserId, loadTasks, loadReminders } = useStore();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      setUserId(user.uid);
      loadTasks();
      loadReminders();
      // Load other data...
    }
  }, [user]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div>
      {/* Your dashboard content */}
    </div>
  );
}
```

## 🚀 Benefits of Firebase Integration

### 1. **Real Database**
- Data persists across devices
- No localStorage limitations
- Automatic synchronization

### 2. **User Authentication**
- Secure user accounts
- Password reset functionality
- Email verification (optional)

### 3. **Multi-Device Support**
- Access data from any device
- Real-time synchronization
- Offline support (with Firestore)

### 4. **Scalability**
- Handles multiple users
- Automatic scaling
- No server management

### 5. **Security**
- Firestore security rules
- User-specific data isolation
- Encrypted connections

## 📊 Firebase vs localStorage

| Feature | localStorage | Firebase |
|---------|-------------|----------|
| Persistence | Browser only | Cloud database |
| Multi-device | ❌ No | ✅ Yes |
| User accounts | ❌ No | ✅ Yes |
| Data limit | ~5-10 MB | 1 GB free |
| Offline support | ✅ Yes | ✅ Yes (with config) |
| Real-time sync | ❌ No | ✅ Yes |
| Security | ❌ Client-side | ✅ Server rules |
| Backup | ❌ Manual | ✅ Automatic |

## 🎯 Testing Strategy

1. **Test Authentication**
   - Register new user
   - Login with credentials
   - Logout
   - Password reset

2. **Test Data Operations**
   - Create items (tasks, notes, etc.)
   - Read/view items
   - Update items
   - Delete items

3. **Test Multi-Device**
   - Login on different browser
   - Verify data syncs
   - Make changes on one device
   - Check updates on other device

4. **Test Security**
   - Try accessing another user's data
   - Verify security rules block unauthorized access

## 📝 Important Notes

- **Environment Variables:** Never commit `.env.local` to git
- **Security Rules:** Always test rules before production
- **Free Tier:** Monitor usage to stay within limits
- **Backups:** Enable automated backups in Firebase Console
- **Error Handling:** Add try-catch blocks for all Firebase calls

## 🆘 Need Help?

- Check `FIREBASE_SETUP.md` for setup instructions
- Review Firebase documentation
- Check browser console for errors
- Verify Firestore security rules
- Test with Firebase Emulator (optional)

---

**Ready to integrate? Start with Step 1 in the Next Steps section!**
