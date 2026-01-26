'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { User } from '@/types';

interface AuthContextType {
  user: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserData: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Fetch user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as User);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create user document in Firestore
    const newUser: User = {
      id: userCredential.user.uid,
      name,
      email,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      createdAt: new Date(),
    };
    
    await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
    
    // Create default settings
    await setDoc(doc(db, 'settings', userCredential.user.uid), {
      theme: 'system',
      notifications: true,
      soundEffects: false,
    });
    
    setUserData(newUser);
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    // Check if user document exists, if not create it
    const userDoc = await getDoc(doc(db, 'users', result.user.uid));
    
    if (!userDoc.exists()) {
      // Create user document for new Google sign-in
      const newUser: User = {
        id: result.user.uid,
        name: result.user.displayName || 'User',
        email: result.user.email || '',
        avatar: result.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(result.user.displayName || 'User')}&background=random`,
        createdAt: new Date(),
      };
      
      await setDoc(doc(db, 'users', result.user.uid), newUser);
      
      // Create default settings
      await setDoc(doc(db, 'settings', result.user.uid), {
        theme: 'system',
        notifications: true,
        soundEffects: false,
      });
      
      setUserData(newUser);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUserData(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateUserData = async (data: Partial<User>) => {
    if (!user) throw new Error('No user logged in');
    
    // Update Firestore document
    await setDoc(doc(db, 'users', user.uid), data, { merge: true });
    
    // Update local state
    setUserData((prev) => (prev ? { ...prev, ...data } : null));
  };

  const value = {
    user,
    userData,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    logout,
    resetPassword,
    updateUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
