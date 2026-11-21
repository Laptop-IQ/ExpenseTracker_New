import express from "express";
import authMiddleware from "../middleware/auth.js";
import {
  addCategory,
  deleteCategory,
  getCategories,
  saveBuiltinOverride,
  updateCategory,
} from "../controllers/categoryController.js";

const categoryRouter = express.Router();

categoryRouter.get("/", authMiddleware, getCategories);
categoryRouter.post("/", authMiddleware, addCategory);
// must stay above "/:id"
categoryRouter.put("/builtin", authMiddleware, saveBuiltinOverride);
categoryRouter.put("/:id", authMiddleware, updateCategory);
categoryRouter.delete("/:id", authMiddleware, deleteCategory);

export default categoryRouter;
