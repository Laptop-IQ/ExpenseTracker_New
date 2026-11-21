import mongoose from "mongoose";

/**
 * One document per user-specific category record.
 *
 *  - builtin: false  -> a custom category created by the user
 *  - builtin: true   -> an override of a built-in category (custom colour/icon)
 *                       or a "hidden" flag so it no longer shows in the picker
 *
 * Transactions store the category `key`, so the key of a custom category is
 * derived from its name (e.g. "Pet Care" -> "Pet_Care").
 */
const categorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    type: { type: String, enum: ["income", "expense"], required: true },
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true, maxlength: 30 },
    icon: { type: String, default: "Tag" },
    color: { type: String, default: "#6366f1" },
    builtin: { type: Boolean, default: false },
    hidden: { type: Boolean, default: false },
  },
  { timestamps: true },
);

categorySchema.index({ userId: 1, type: 1, key: 1 }, { unique: true });

const categoryModel =
  mongoose.models.category || mongoose.model("category", categorySchema);

export default categoryModel;
