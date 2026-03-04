import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, indexedDBLocalPersistence, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
    appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

// Initialize Firebase securely (prevent overlapping instances in React strict mode)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Safari can fail with IndexedDB persistence — fall back to localStorage
export const authReady = setPersistence(auth, indexedDBLocalPersistence).catch(() =>
    setPersistence(auth, browserLocalPersistence),
);

export { app, auth, db };
