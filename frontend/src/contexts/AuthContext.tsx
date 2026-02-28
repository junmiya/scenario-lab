import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { subscribeToAuthChanges, signOut as firebaseSignOut, handleRedirectResult } from '../lib/firebase/authService';
import { authReady } from '../lib/firebase/config';

interface AuthContextType {
    user: FirebaseUser | null;
    loading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        // Wait for persistence to be ready (Safari IndexedDB workaround), then subscribe
        // Handle redirect result in parallel (don't block auth listener)
        void handleRedirectResult();

        void authReady
            .then(() => {
                unsubscribe = subscribeToAuthChanges((firebaseUser) => {
                    setUser(firebaseUser);
                    setLoading(false);
                });
            })
            .catch(() => {
                // Persistence failed entirely — still allow login flow
                setLoading(false);
            });

        // Safety timeout: if auth never resolves within 5s, unblock the UI
        const timer = setTimeout(() => setLoading(false), 5000);

        return () => {
            clearTimeout(timer);
            unsubscribe?.();
        };
    }, []);

    const logout = async () => {
        await firebaseSignOut();
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
