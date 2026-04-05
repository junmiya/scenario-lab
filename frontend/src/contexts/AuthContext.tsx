import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import {
    subscribeToAuthChanges,
    signOut as firebaseSignOut,
    handleRedirectResult,
    subscribeToUserProfile,
} from '../lib/firebase/authService';
import type { UserProfile, UserRole } from '../lib/firebase/authService';
import { authReady } from '../lib/firebase/config';

interface AuthContextType {
    user: FirebaseUser | null;
    userProfile: UserProfile | null;
    loading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeAuth: (() => void) | undefined;
        let unsubscribeProfile: (() => void) | undefined;

        void handleRedirectResult();

        void authReady
            .then(() => {
                unsubscribeAuth = subscribeToAuthChanges((firebaseUser) => {
                    setUser(firebaseUser);
                    // Clean up previous profile listener
                    unsubscribeProfile?.();
                    if (firebaseUser) {
                        unsubscribeProfile = subscribeToUserProfile(firebaseUser.uid, (profile) => {
                            setUserProfile(profile);
                            setLoading(false);
                        });
                    } else {
                        setUserProfile(null);
                        setLoading(false);
                    }
                });
            })
            .catch(() => {
                setLoading(false);
            });

        const timer = setTimeout(() => setLoading(false), 5000);

        return () => {
            clearTimeout(timer);
            unsubscribeAuth?.();
            unsubscribeProfile?.();
        };
    }, []);

    const logout = async () => {
        await firebaseSignOut();
    };

    return (
        <AuthContext.Provider value={{ user, userProfile, loading, logout }}>
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

export function useUserRole(): UserRole {
    const { userProfile } = useAuth();
    return userProfile?.role ?? 'student';
}
