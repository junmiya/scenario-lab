import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp,
    deleteDoc,
} from 'firebase/firestore';
import { db } from './config';

export interface FirestoreScript {
    id: string;
    ownerId: string;
    title: string;
    authorName: string;
    synopsis: string;
    content: string;
    characters: Array<{
        id: string;
        name: string;
        age?: string;
        traits?: string;
        background?: string;
    }>;
    settings: {
        lineLength: number;
        pageCount: number;
    };
    createdAt?: any;
    updatedAt?: any;
}

/**
 * Create a new script document in Firestore.
 */
export async function createScript(ownerId: string, data: {
    title: string;
    authorName: string;
    settings: { lineLength: number; pageCount: number };
}): Promise<string> {
    const docRef = doc(collection(db, 'scripts'));
    const newScript: Omit<FirestoreScript, 'id'> = {
        ownerId,
        title: data.title || '無題の脚本',
        authorName: data.authorName || '',
        synopsis: '',
        content: '',
        characters: [],
        settings: data.settings,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    await setDoc(docRef, newScript);
    return docRef.id;
}

/**
 * List all scripts for a given user, sorted by most recently updated.
 */
export async function listScripts(ownerId: string): Promise<FirestoreScript[]> {
    const q = query(
        collection(db, 'scripts'),
        where('ownerId', '==', ownerId),
        orderBy('updatedAt', 'desc'),
    );
    const snapshot = await getDocs(q);
    const scripts: FirestoreScript[] = [];
    snapshot.forEach((docSnap) => {
        scripts.push({ id: docSnap.id, ...docSnap.data() } as FirestoreScript);
    });
    return scripts;
}

/**
 * Fetch a single script by its ID.
 */
export async function getScript(scriptId: string): Promise<FirestoreScript | null> {
    const docRef = doc(db, 'scripts', scriptId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as FirestoreScript;
    }
    return null;
}

/**
 * Update a script's fields.
 */
export async function updateScript(
    scriptId: string,
    data: Partial<Pick<FirestoreScript, 'title' | 'authorName' | 'synopsis' | 'content' | 'characters' | 'settings'>>,
): Promise<void> {
    const docRef = doc(db, 'scripts', scriptId);
    await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

/**
 * Delete a script permanently.
 */
export async function deleteScript(scriptId: string): Promise<void> {
    const docRef = doc(db, 'scripts', scriptId);
    await deleteDoc(docRef);
}
