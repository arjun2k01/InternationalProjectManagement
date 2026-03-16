const {
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
} = require("../services/auth.service");
const catchAsync = require("../utils/catchAsync");

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
const register = catchAsync(async (req, res) => {
  const { name, email, password } = req.body;

  const result = await registerUser({ name, email, password });

  res.status(201).json({
    success: true,
    message: "User registered successfully.",
    data: result,
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const result = await loginUser({ email, password });

  res.status(200).json({
    success: true,
    message: "Login successful.",
    data: result,
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/refresh
// ---------------------------------------------------------------------------
const refreshToken = catchAsync(async (req, res) => {
  const result = await refreshAccessToken(req.body.refreshToken);

  res.status(200).json({
    success: true,
    message: "Access token refreshed successfully.",
    data: result,
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
const logout = catchAsync(async (req, res) => {
  await logoutUser({
    userId: req.user?.id,
    refreshToken: req.body.refreshToken,
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
const getMe = catchAsync(async (req, res) => {
  const user = await getCurrentUser(req.user.id);

  res.status(200).json({
    success: true,
    data: user,
  });
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  getMe,
  login,
  logout,
  refreshToken,
  register,
};
