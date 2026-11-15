import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,

    isVerified: { type: Boolean, default: false },

    otp: String,
    otpExpire: Date,
    profilePic: String, // ✅ add this
    cloudinaryId: String, // ✅ add this

    // demo / guest sandbox accounts (deleted on logout or when expired)
    isGuest: { type: Boolean, default: false, index: true },
    guestExpiresAt: Date,
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
