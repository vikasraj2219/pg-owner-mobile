import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { safeStorage } from '../utils/storage';
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
const BIOMETRIC_TOKEN_KEY = 'biometric_auth_token';
const BIOMETRIC_CACHE_KEY = 'biometric_user_cache';
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
  isBiometricEnabled: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterOwnerPayload) => Promise<void>;
  logout: (clearBiometrics?: boolean) => Promise<void>;
  unlockWithBiometrics: () => Promise<boolean>;
  enableBiometrics: (enable: boolean) => Promise<boolean>;
  loginWithBiometrics: () => Promise<{ success: boolean; message?: string }>;
  loginWithDemo: () => Promise<void>;
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
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);

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
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        setIsUnlocked(true);
        return true;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock PG Manager',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsUnlocked(true);
        return true;
      }
      return false;
    } catch (_err) {
      setIsUnlocked(true);
      return true;
    }
  }, []);

  // Set Auth state and persist across native and web
  const persistAuthData = async (data: AuthResponseData) => {
    setToken(data.token);
    setUser(data.user);
    setOrganization(data.organization);
    setSubscription(data.subscription);
    setIsUnlocked(true);

    try {
      const cachePayload = JSON.stringify({
        user: data.user,
        organization: data.organization,
        subscription: data.subscription,
      });

      await safeStorage.setItem(TOKEN_KEY, data.token);
      await safeStorage.setItem(USER_CACHE_KEY, cachePayload);

      // Only persist biometric credentials if user has not explicitly disabled them
      const currentPref = await safeStorage.getItem(BIOMETRIC_PREF_KEY);
      if (currentPref !== 'false') {
        await safeStorage.setItem(BIOMETRIC_TOKEN_KEY, data.token);
        await safeStorage.setItem(BIOMETRIC_CACHE_KEY, cachePayload);
        if (currentPref === null) {
          await safeStorage.setItem(BIOMETRIC_PREF_KEY, 'true');
          setIsBiometricEnabled(true);
        }
      }
    } catch (_err) {
      // Ignore storage persistence failure
    }
  };

  // Initial Load & Session Recovery
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await checkBiometrics();

        const storedToken = await safeStorage.getItem(TOKEN_KEY);
        const cachedDataStr = await safeStorage.getItem(USER_CACHE_KEY);
        const biometricPref = await safeStorage.getItem(BIOMETRIC_PREF_KEY);
        setIsBiometricEnabled(biometricPref === 'true');

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

  const loginWithDemo = async () => {
    setIsLoading(true);
    try {
      const demoData: AuthResponseData = {
        token: 'demo-jwt-token',
        user: {
          id: 'u-1',
          name: 'Ramesh Kumar',
          phone: '9876543210',
          email: 'ramesh@srisaipg.in',
          role: 'owner',
        },
        organization: {
          _id: 'org-1',
          name: 'Sri Sai Boys PG, Madhapur',
          ownerName: 'Ramesh Kumar',
          phone: '9876543210',
          email: 'ramesh@srisaipg.in',
          settings: {
            rentDueDay: 5,
            gracePeriodDays: 5,
            defaultLateFeePaise: 50000,
          },
        },
        subscription: {
          _id: 'sub-1',
          organization: 'org-1',
          plan: 'starter',
          status: 'trialing',
          trialEndsAt: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString(),
          currentPeriodEnd: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString(),
          maxProperties: 1,
          maxBeds: 50,
        },
      };
      await persistAuthData(demoData);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (clearBiometrics = false) => {
    setIsLoading(true);
    try {
      await safeStorage.deleteItem(TOKEN_KEY);
      await safeStorage.deleteItem(USER_CACHE_KEY);
      await safeStorage.deleteItem('selected_property_id');
      if (clearBiometrics) {
        await safeStorage.deleteItem(BIOMETRIC_TOKEN_KEY);
        await safeStorage.deleteItem(BIOMETRIC_CACHE_KEY);
        await safeStorage.deleteItem(BIOMETRIC_PREF_KEY);
        setIsBiometricEnabled(false);
      }
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

  const enableBiometrics = async (enable: boolean): Promise<boolean> => {
    try {
      if (enable) {
        const success = await unlockWithBiometrics();
        if (!success) return false;
        // Save active session as biometric credentials
        if (token && user && organization) {
          const cachePayload = JSON.stringify({
            user,
            organization,
            subscription,
          });
          await safeStorage.setItem(BIOMETRIC_TOKEN_KEY, token);
          await safeStorage.setItem(BIOMETRIC_CACHE_KEY, cachePayload);
        }
      } else {
        // Disabling: completely purge stored biometric credentials
        await safeStorage.deleteItem(BIOMETRIC_TOKEN_KEY);
        await safeStorage.deleteItem(BIOMETRIC_CACHE_KEY);
      }
      await safeStorage.setItem(BIOMETRIC_PREF_KEY, enable ? 'true' : 'false');
      setIsBiometricEnabled(enable);
      return true;
    } catch (_err) {
      return false;
    }
  };

  const loginWithBiometrics = async (): Promise<{ success: boolean; message?: string }> => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        return {
          success: false,
          message: 'Biometric authentication is not supported on this device.',
        };
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        return {
          success: false,
          message:
            'No biometric credentials (fingerprint/face) enrolled on this device. Please set up biometrics in your device Settings.',
        };
      }

      // Check if user explicitly turned off biometrics
      const biometricPref = await safeStorage.getItem(BIOMETRIC_PREF_KEY);
      if (biometricPref === 'false') {
        return {
          success: false,
          message:
            'Biometric login is currently turned off. Please log in with your phone or email and password, then enable Biometric App Lock in More > Settings.',
        };
      }

      // Check saved credentials
      const savedToken = await safeStorage.getItem(BIOMETRIC_TOKEN_KEY);
      const savedDataStr = await safeStorage.getItem(BIOMETRIC_CACHE_KEY);

      if (!savedToken || !savedDataStr) {
        return {
          success: false,
          message:
            'No saved biometric credentials found on this device. Please log in with your phone or email and password first.',
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Log in to PG Manager',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (!result.success) {
        return {
          success: false,
          message: 'Biometric authentication was cancelled or not recognized.',
        };
      }

      const cachedData = JSON.parse(savedDataStr);
      setToken(savedToken);
      setUser(cachedData.user);
      setOrganization(cachedData.organization);
      setSubscription(cachedData.subscription);
      setIsUnlocked(true);

      // Re-persist active session
      await safeStorage.setItem(TOKEN_KEY, savedToken);
      await safeStorage.setItem(USER_CACHE_KEY, savedDataStr);

      // Silently refresh in background
      try {
        const freshData = await getMeApi();
        setUser(freshData.user);
        setOrganization(freshData.organization);
        setSubscription(freshData.subscription);
      } catch {
        // Offline is fine
      }

      return { success: true };
    } catch (_err) {
      return {
        success: false,
        message: 'An error occurred during biometric authentication.',
      };
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
        isBiometricEnabled,
        login,
        register,
        logout,
        unlockWithBiometrics,
        enableBiometrics,
        loginWithBiometrics,
        loginWithDemo,
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
