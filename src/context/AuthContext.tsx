import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  IUser,
  IOrganization,
  ISubscription,
  LoginPayload,
  RegisterOwnerPayload,
  AuthResponseData,
} from '../types/api';
import { loginApi, registerOwnerApi, getMeApi } from '../api/auth';

const TOKEN_KEY = 'auth_token';
const USER_CACHE_KEY = 'auth_user_cache';
const BIOMETRIC_PREF_KEY = 'biometric_enabled';

interface AuthContextType {
  user: IUser | null;
  organization: IOrganization | null;
  subscription: ISubscription | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isUnlocked: boolean;
  isBiometricSupported: boolean;
  isBiometricEnrolled: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterOwnerPayload) => Promise<void>;
  logout: () => Promise<void>;
  unlockWithBiometrics: () => Promise<boolean>;
  enableBiometrics: (enable: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<IUser | null>(null);
  const [organization, setOrganization] = useState<IOrganization | null>(null);
  const [subscription, setSubscription] = useState<ISubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricEnrolled, setIsBiometricEnrolled] = useState(false);

  // Check hardware biometric capability
  const checkBiometrics = useCallback(async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsBiometricSupported(compatible);
      if (compatible) {
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setIsBiometricEnrolled(enrolled);
      }
    } catch (_err) {
      setIsBiometricSupported(false);
      setIsBiometricEnrolled(false);
    }
  }, []);

  // Biometric Unlock Prompt
  const unlockWithBiometrics = useCallback(async (): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock PG Owner',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsUnlocked(true);
        return true;
      }
      return false;
    } catch (_err) {
      return false;
    }
  }, []);

  // Set Auth state and persist in SecureStore
  const persistAuthData = async (data: AuthResponseData) => {
    setToken(data.token);
    setUser(data.user);
    setOrganization(data.organization);
    setSubscription(data.subscription);
    setIsUnlocked(true);

    try {
      await SecureStore.setItemAsync(TOKEN_KEY, data.token);
      await SecureStore.setItemAsync(
        USER_CACHE_KEY,
        JSON.stringify({
          user: data.user,
          organization: data.organization,
          subscription: data.subscription,
        }),
      );
    } catch (_err) {
      // SecureStore may fail on certain web setups
    }
  };

  // Initial Load & Session Recovery
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await checkBiometrics();

        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        const cachedDataStr = await SecureStore.getItemAsync(USER_CACHE_KEY);
        const biometricPref = await SecureStore.getItemAsync(BIOMETRIC_PREF_KEY);

        if (storedToken && cachedDataStr) {
          const cachedData = JSON.parse(cachedDataStr);
          setToken(storedToken);
          setUser(cachedData.user);
          setOrganization(cachedData.organization);
          setSubscription(cachedData.subscription);

          // If biometrics enabled and available, require unlock
          if (biometricPref === 'true' && isBiometricEnrolled) {
            setIsUnlocked(false);
            const unlocked = await unlockWithBiometrics();
            if (!unlocked) {
              // Leave isUnlocked as false so lock screen shows
            }
          } else {
            setIsUnlocked(true);
          }

          // Silently refresh profile in background
          try {
            const freshData = await getMeApi();
            setUser(freshData.user);
            setOrganization(freshData.organization);
            setSubscription(freshData.subscription);
          } catch (_refreshErr) {
            // Offline or token expired; cached state allows reading
          }
        }
      } catch (_err) {
        // Fallback on error
      } finally {
        setIsLoading(false);
      }
    };

    void initializeAuth();
  }, [checkBiometrics, isBiometricEnrolled, unlockWithBiometrics]);

  const login = async (payload: LoginPayload) => {
    setIsLoading(true);
    try {
      const data = await loginApi(payload);
      await persistAuthData(data);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterOwnerPayload) => {
    setIsLoading(true);
    try {
      const data = await registerOwnerApi(payload);
      await persistAuthData(data);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_CACHE_KEY);
      setToken(null);
      setUser(null);
      setOrganization(null);
      setSubscription(null);
      setIsUnlocked(false);
    } catch (_err) {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  const enableBiometrics = async (enable: boolean) => {
    try {
      await SecureStore.setItemAsync(BIOMETRIC_PREF_KEY, enable ? 'true' : 'false');
    } catch (_err) {
      // Ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        subscription,
        token,
        isLoading,
        isAuthenticated: Boolean(token && user),
        isUnlocked,
        isBiometricSupported,
        isBiometricEnrolled,
        login,
        register,
        logout,
        unlockWithBiometrics,
        enableBiometrics,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
