import api, {
  clearAuthTokens,
  getRefreshToken,
  setAuthTokens,
} from "./api";

const extractPayload = (response) => response.data?.data ?? response.data;

const persistTokens = (payload) => {
  if (payload?.tokens) {
    setAuthTokens(payload.tokens);
  }

  return payload;
};

export const register = async (name, email, password) => {
  const response = await api.post("/auth/register", {
    name,
    email,
    password,
  });

  return persistTokens(extractPayload(response));
};

export const login = async (email, password) => {
  const response = await api.post("/auth/login", {
    email,
    password,
  });

  return persistTokens(extractPayload(response));
};

export const refreshToken = async () => {
  const refreshTokenValue = getRefreshToken();
  const response = await api.post("/auth/refresh", {
    refreshToken: refreshTokenValue,
  });

  return persistTokens(extractPayload(response));
};

export const logout = async () => {
  const refreshTokenValue = getRefreshToken();

  try {
    await api.post("/auth/logout", {
      refreshToken: refreshTokenValue,
    });
  } finally {
    clearAuthTokens();
  }
};

export const getMe = async () => {
  const response = await api.get("/auth/me");
  return extractPayload(response);
};
