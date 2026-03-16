import { create } from "zustand";

import { clearAuthTokens, getAccessToken } from "../services/api";
import * as authService from "../services/auth.service";

const extractErrorMessage = (error, fallback) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const buildSignedOutState = () => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  loading: false,
  error: null,
});

const buildSignedInState = (payload, tokenOverride) => {
  const token = tokenOverride || payload?.tokens?.accessToken || getAccessToken();

  return {
    user: payload?.user || null,
    token,
    isAuthenticated: Boolean(payload?.user && token),
    isLoading: false,
    loading: false,
    error: null,
  };
};

const useAuthStore = create((set) => ({
  ...buildSignedOutState(),
  token: getAccessToken(),
  isAuthenticated: Boolean(getAccessToken()),

  loadUser: async () => {
    const accessToken = getAccessToken();

    if (!accessToken) {
      set(buildSignedOutState());
      return null;
    }

    set({
      isLoading: true,
      loading: true,
      error: null,
      token: accessToken,
    });

    try {
      const user = await authService.getMe();
      const nextState = buildSignedInState({ user }, accessToken);
      set(nextState);
      return user;
    } catch (error) {
      clearAuthTokens();
      set({
        ...buildSignedOutState(),
        error: extractErrorMessage(error, "Unable to restore your session."),
      });
      return null;
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, loading: true, error: null });

    try {
      const payload = await authService.login(email, password);
      set(buildSignedInState(payload));
      return payload;
    } catch (error) {
      set({
        ...buildSignedOutState(),
        error: extractErrorMessage(error, "Unable to sign in."),
      });
      throw error;
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, loading: true, error: null });

    try {
      const payload = await authService.register(name, email, password);
      set(buildSignedInState(payload));
      return payload;
    } catch (error) {
      set({
        ...buildSignedOutState(),
        error: extractErrorMessage(error, "Unable to create your account."),
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true, loading: true, error: null });

    try {
      await authService.logout();
    } finally {
      set(buildSignedOutState());
    }
  },
}));

export default useAuthStore;
