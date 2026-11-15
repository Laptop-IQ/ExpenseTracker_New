import express from "express";
import {
  registerUser,
  loginUser,
  getCurrentUser,
  updateProfile,
  updatePassword,
  verifySignupOTP,
  resendSignupOTP,
  forgotPassword,
  verifyForgotOTP,
  resetPassword,
  removeProfilePhoto,
  updateProfileWithImage,
  deleteAccount,
} from "../controllers/userController.js";

import authMiddleware from "../middleware/auth.js";
import { startGuest, endGuest, blockGuest } from "../controllers/guestController.js";
import { upload } from "../middleware/multer.js";

const router = express.Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Demo / guest account
router.post("/guest", startGuest);
router.post("/guest/end", authMiddleware, endGuest);
router.post("/verify-signup-otp", verifySignupOTP);
router.post("/resend-signup-otp", resendSignupOTP);
router.post("/forgot-password", forgotPassword);
router.post("/verify-forgot-otp", verifyForgotOTP);
router.post("/reset-password", resetPassword);

// Protected routes
router.get("/me", authMiddleware, getCurrentUser);
router.put("/profile", authMiddleware, updateProfile);
router.put("/password", authMiddleware, blockGuest, updatePassword);
router.delete("/profile/photo", authMiddleware, removeProfilePhoto);

router.post(
  "/profile/photo",
  authMiddleware,
  blockGuest,
  upload.single("profilePic"), // 'profilePic' must match the key in your FormData
  updateProfileWithImage,
);

// DELETE ACCOUNT
router.delete("/delete-account", authMiddleware, blockGuest, deleteAccount);

export default router;
