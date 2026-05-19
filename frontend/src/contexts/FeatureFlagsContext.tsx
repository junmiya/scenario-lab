import React, { createContext, useContext, useEffect, useState } from 'react';
import { getFeatureFlags, type FeatureFlags } from '../lib/firebase/firestoreService';
import { useAuth } from './AuthContext';

const DEFAULT_FLAGS: FeatureFlags = {
  groups: true,
  contests: true,
  corrections: true,
  comments: true,
  aiAdvice: true,
  aiDiscussion: true,
};

const FeatureFlagsContext = createContext<FeatureFlags>(DEFAULT_FLAGS);

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);

  useEffect(() => {
    if (!user) return;
    void getFeatureFlags()
      .then(setFlags)
      .catch(() => {
        /* keep defaults */
      });
  }, [user]);

  return <FeatureFlagsContext.Provider value={flags}>{children}</FeatureFlagsContext.Provider>;
}

export function useFeatureFlags(): FeatureFlags {
  return useContext(FeatureFlagsContext);
}
