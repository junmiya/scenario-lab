import {
    signInWithRedirect,
    getRedirectResult,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    type User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';

const googleProvider = new GoogleAuthProvider();

export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
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

// Process redirect result on page load
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

export const signInWithGoogle = async () => {
    await signInWithRedirect(auth, googleProvider);
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
