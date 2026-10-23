/**
 * Account calls for the mobile app: create an account, sign in, and confirm a
 * stored session. These talk to the public /auth endpoints on the backend.
 *
 * The shape here is the one AuthContext keeps and the screens render, so the
 * backend's response is narrowed to just those fields.
 */
import {ApiError, apiPost, apiPut, apiRequest, apiDelete} from './api';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  country_code: string | null;
  premium: boolean;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  country_code: string;
  password: string;
}

interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: AuthUser;
}

// A rejection that also carries the per-field messages the register endpoint
// returns, so a form can mark the exact inputs that need correcting.
export class AuthFieldError extends ApiError {
  errors: Record<string, string>;

  constructor(message: string, errors: Record<string, string>) {
    super('server', message);
    this.name = 'AuthFieldError';
    this.errors = errors;
  }
}

/**
 * The per-field messages a rejected auth call returned, if any. The register
 * endpoint answers an invalid body with `{message, errors}`, which apiPost
 * keeps on ApiError.data, so screens can highlight the exact input at fault.
 */
export const authFieldErrors = (err: unknown): Record<string, string> => {
  if (err instanceof AuthFieldError) {
    return err.errors;
  }
  if (err instanceof ApiError) {
    const errors = (err.data as {errors?: Record<string, string>} | undefined)?.errors;
    if (errors) {
      return errors;
    }
  }
  return {};
};

const toAuthError = (data: AuthResponse, fallback: string): Error => {
  const errors = (data as {errors?: Record<string, string>}).errors;
  if (errors && Object.keys(errors).length > 0) {
    return new AuthFieldError(data.message || fallback, errors);
  }
  return new ApiError('server', data.message || fallback);
};

/**
 * Create an account and return the session to store. Rejects with an ApiError
 * (offline/timeout/server) or an AuthFieldError when the backend marked
 * specific inputs invalid.
 */
export const registerUser = async (input: RegisterInput): Promise<AuthSession> => {
  const data = await apiPost<AuthResponse>('/auth/register', input);

  if (!data.success || !data.token || !data.user) {
    throw toAuthError(data, 'Registration failed.');
  }

  return {token: data.token, user: data.user};
};

/**
 * Sign in and return the session to store. Rejects with an ApiError whose
 * message is the server's ("Invalid email or password.") and is safe to show.
 */
export const loginUser = async (
  email: string,
  password: string,
): Promise<AuthSession> => {
  const data = await apiPost<AuthResponse>('/auth/login', {email, password});

  if (!data.success || !data.token || !data.user) {
    throw toAuthError(data, 'Login failed.');
  }

  return {token: data.token, user: data.user};
};

/**
 * Fetch the signed-in account for a stored token. Used at launch to confirm the
 * token is still valid; rejects with an ApiError when it is not, which tells
 * AuthContext to drop the session.
 */
export const fetchCurrentUser = async (token: string): Promise<AuthUser> => {
  const data = await apiRequest<{success: boolean; user?: AuthUser; message?: string}>(
    '/auth/me',
    token,
  );

  if (!data.success || !data.user) {
    throw new ApiError('server', data.message || 'Could not load your account.');
  }

  return data.user;
};

/**
 * Soft deletes the current user's account. Calls DELETE /auth/account with the
 * bearer token. Rejects with ApiError on failure.
 */
export const deleteAccount = async (token: string): Promise<void> => {
  const data = await apiDelete<{success: boolean; message?: string}>(
    '/auth/account',
    token,
  );

  if (!data.success) {
    throw new ApiError('server', data.message || 'Failed to delete account.');
  }
};

/**
 * Updates the current user's profile (name, email, phone, country_code).
 * Rejects with ApiError or AuthFieldError on failure.
 */
export interface UpdateProfileInput {
  name: string;
  email: string;
  phone: string;
  country_code: string;
}

export const updateProfile = async (
  token: string,
  input: UpdateProfileInput,
): Promise<AuthUser> => {
  const data = await apiPut<AuthResponse>('/auth/profile', input, token);

  if (!data.success || !data.user) {
    throw toAuthError(data, 'Failed to update profile.');
  }

  return data.user;
};

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

/**
 * Changes the signed-in user's password. Rejects with ApiError or
 * AuthFieldError (currentPassword / newPassword) on failure.
 */
export const changePassword = async (
  token: string,
  input: ChangePasswordInput,
): Promise<void> => {
  const data = await apiPut<{success: boolean; message?: string}>(
    '/auth/change-password',
    input,
    token,
  );

  if (!data.success) {
    throw toAuthError(data as AuthResponse, 'Failed to change password.');
  }
};
