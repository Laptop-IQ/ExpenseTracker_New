// ✅ FILE PATH: backend/models/goalModel.js
// ─────────────────────────────────────────
import mongoose from "mongoose";

const goalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Goal name is required"],
      trim: true,
      maxlength: [80, "Name cannot exceed 80 characters"],
    },
    target: {
      type: Number,
      required: [true, "Target amount is required"],
      min: [1, "Target must be at least ₹1"],
    },
    saved: {
      type: Number,
      default: 0,
      min: [0, "Saved amount cannot be negative"],
    },
    monthly: {
      type: Number,
      default: 0,
      min: [0, "Monthly contribution cannot be negative"],
    },
    deadline: {
      type: String,
      default: null,
    },
    color: {
      type: String,
      default: "#7c3aed",
    },
    icon: {
      type: String,
      default: "piggy",
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// ✅ async pre-save — no next() needed
goalSchema.pre("save", async function () {
  this.isCompleted = this.saved >= this.target;
});

goalSchema.virtual("percentage").get(function () {
  return this.target > 0
    ? Math.min(Math.round((this.saved / this.target) * 100), 100)
    : 0;
});

goalSchema.virtual("remaining").get(function () {
  return Math.max(this.target - this.saved, 0);
});

goalSchema.set("toJSON", { virtuals: true });
goalSchema.set("toObject", { virtuals: true });

const Goal = mongoose.model("Goal", goalSchema);
export default Goal;
