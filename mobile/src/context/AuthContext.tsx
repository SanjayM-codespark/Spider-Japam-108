import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import {getSetting, setSetting} from '../database/database';
import {ApiError} from '../services/api';
import {
  AuthUser,
  RegisterInput,
  UpdateProfileInput,
  ChangePasswordInput,
  fetchCurrentUser,
  loginUser,
  registerUser,
  deleteAccount,
  updateProfile,
  changePassword as changePasswordRequest,
} from '../services/auth';

// The signed-in account is kept in the same local settings table as the rest of
// the app's state, so a session survives closing and reopening the app without
// adding another storage dependency.
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  /** True while the stored session is being read at launch. */
  restoring: boolean;
  /**
   * Resolves with the stored token once the launch read finishes: a string when
   * a session was found, otherwise null. The splash awaits this so it routes on
   * the restored session rather than a state value that has not re-rendered yet.
   */
  ready: Promise<string | null>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<void>;
  changePassword: (input: ChangePasswordInput) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  restoring: true,
  ready: Promise.resolve(null),
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  deleteAccount: async () => {},
  updateProfile: async () => {},
  changePassword: async () => {},
});

const parseUser = (raw: string | null): AuthUser | null => {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);

  // A promise the splash awaits so it does not route before the stored session
  // is known. Created once and resolved with the token (or null) when the
  // initial read finishes.
  const readyResolveRef = useRef<(token: string | null) => void>(() => {});
  const readyRef = useRef<Promise<string | null> | undefined>(undefined);
  if (!readyRef.current) {
    readyRef.current = new Promise<string | null>(resolve => {
      readyResolveRef.current = resolve;
    });
  }

  useEffect(() => {
    let active = true;

    const restore = async () => {
      const [storedToken, storedUser] = await Promise.all([
        getSetting(TOKEN_KEY),
        getSetting(USER_KEY),
      ]);

      if (!active) {
        return;
      }

      const cachedUser = parseUser(storedUser);
      if (storedToken && cachedUser) {
        // Validate the token with the server before using it.
        // If validation fails (server says invalid/expired), clear session.
        // Network errors will keep the cached session but we'll still route
        // based on validation result.
        let valid = false;
        try {
          const fresh = await fetchCurrentUser(storedToken);
          if (active) {
            setToken(storedToken);
            setUser(fresh);
            await setSetting(USER_KEY, JSON.stringify(fresh));
            valid = true;
          }
        } catch (err) {
          // Only an explicit rejection (401/403) proves the token is bad.
          // Offline, timeout, a 5xx or the whole server being down also makes
          // this call fail, and signing the user out over a temporary outage
          // would throw away a perfectly valid session — so those cases keep
          // the cached one and route as signed in.
          const rejected =
            err instanceof ApiError &&
            err.kind === 'server' &&
            (err.status === 401 || err.status === 403);
          if (rejected) {
            if (active) {
              setToken(null);
              setUser(null);
              await Promise.all([
                setSetting(TOKEN_KEY, ''),
                setSetting(USER_KEY, ''),
              ]);
            }
            setRestoring(false);
            readyResolveRef.current(null);
            return;
          }

          if (active) {
            setToken(storedToken);
            setUser(cachedUser);
            valid = true;
          }
        }

        setRestoring(false);
        readyResolveRef.current(valid ? storedToken : null);
        return;
      }

      setRestoring(false);
      readyResolveRef.current(null);
    };

    restore();

    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback(async (nextToken: string, nextUser: AuthUser) => {
    setToken(nextToken);
    setUser(nextUser);
    await Promise.all([
      setSetting(TOKEN_KEY, nextToken),
      setSetting(USER_KEY, JSON.stringify(nextUser)),
    ]);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const session = await loginUser(email, password);
      await persist(session.token, session.user);
    },
    [persist],
  );

  const signUp = useCallback(
    async (input: RegisterInput) => {
      const session = await registerUser(input);
      await persist(session.token, session.user);
    },
    [persist],
  );

  const signOut = useCallback(async () => {
    setToken(null);
    setUser(null);
    await Promise.all([setSetting(TOKEN_KEY, ''), setSetting(USER_KEY, '')]);
  }, []);

  const removeAccount = useCallback(async () => {
    if (!token) {
      return;
    }
    await deleteAccount(token);
    setToken(null);
    setUser(null);
    await Promise.all([setSetting(TOKEN_KEY, ''), setSetting(USER_KEY, '')]);
  }, [token]);

  const editProfile = useCallback(
    async (input: UpdateProfileInput) => {
      if (!token) {
        return;
      }
      const updatedUser = await updateProfile(token, input);
      setUser(updatedUser);
      await setSetting(USER_KEY, JSON.stringify(updatedUser));
    },
    [token],
  );

  const editPassword = useCallback(
    async (input: ChangePasswordInput) => {
      if (!token) {
        return;
      }
      await changePasswordRequest(token, input);
    },
    [token],
  );

  const value = useMemo(
    () => ({
      user,
      token,
      restoring,
      ready: readyRef.current as Promise<string | null>,
      signIn,
      signUp,
      signOut,
      deleteAccount: removeAccount,
      updateProfile: editProfile,
      changePassword: editPassword,
    }),
    [user, token, restoring, signIn, signUp, signOut, removeAccount, editProfile, editPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
