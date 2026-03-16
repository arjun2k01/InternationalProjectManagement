const express = require("express");
const { body } = require("express-validator");

const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const router = express.Router();

router.post(
  "/register",
  validate([
    body("name")
      .isString()
      .withMessage("Name must be a string.")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Name must be between 2 and 50 characters."),
    body("email")
      .isEmail()
      .withMessage("A valid email is required.")
      .normalizeEmail(),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long."),
  ]),
  authController.register
);

router.post(
  "/login",
  validate([
    body("email")
      .isEmail()
      .withMessage("A valid email is required.")
      .normalizeEmail(),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long."),
  ]),
  authController.login
);

router.post(
  "/refresh",
  validate([
    body("refreshToken")
      .isString()
      .withMessage("Refresh token must be a string.")
      .notEmpty()
      .withMessage("Refresh token is required."),
  ]),
  authController.refreshToken
);

router.post("/logout", authenticate, authController.logout);

router.get("/me", authenticate, authController.getMe);

module.exports = router;
