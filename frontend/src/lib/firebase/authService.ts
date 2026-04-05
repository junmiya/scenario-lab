import {
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    type User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';

const googleProvider = new GoogleAuthProvider();

export type UserRole = 'system_admin' | 'operator' | 'teacher' | 'student' | 'evaluator';

export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    role: UserRole;
    createdAt?: any;
    updatedAt?: any;
}

const syncUserWithFirestore = async (user: FirebaseUser) => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: 'student',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        await setDoc(userRef, newProfile);
    } else {
        await setDoc(userRef, {
            displayName: user.displayName,
            photoURL: user.photoURL,
            updatedAt: serverTimestamp(),
        }, { merge: true });
    }
};

// Process redirect result on page load (for redirect fallback)
export const handleRedirectResult = async () => {
    try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
            await syncUserWithFirestore(result.user);
        }
    } catch (error) {
        console.error('Redirect result error:', error);
    }
};

// Try popup first; fall back to redirect if popup is blocked
export const signInWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        if (result.user) {
            await syncUserWithFirestore(result.user);
        }
    } catch (error: unknown) {
        if (error instanceof Error && 'code' in error && (error as any).code === 'auth/popup-blocked') {
            await signInWithRedirect(auth, googleProvider);
            return;
        }
        throw error;
    }
};

export const signOut = async () => {
    try {
        await firebaseSignOut(auth);
    } catch (error) {
        console.error('Error signing out:', error);
        throw error;
    }
};

/**
 * Subscribe to authentication state changes.
 */
export const subscribeToAuthChanges = (callback: (user: FirebaseUser | null) => void) => {
    return onAuthStateChanged(auth, callback);
};

/**
 * Subscribe to user profile changes (role updates etc.) in real-time.
 */
export const subscribeToUserProfile = (uid: string, callback: (profile: UserProfile | null) => void) => {
    const userRef = doc(db, 'users', uid);
    return onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
            callback({ uid: snap.id, ...snap.data() } as UserProfile);
        } else {
            callback(null);
        }
    });
};
