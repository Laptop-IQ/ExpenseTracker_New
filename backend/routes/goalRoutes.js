import express from "express";
import {
  getGoals,
  getGoalById,
  createGoal,
  updateGoal,
  contributeToGoal,
  deleteGoal,
  getGoalsSummary,
} from "../controllers/goalController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

// Must be before /:id
router.get("/summary", getGoalsSummary);

router.route("/").get(getGoals).post(createGoal);

router.route("/:id").get(getGoalById).put(updateGoal).delete(deleteGoal);

router.patch("/:id/contribute", contributeToGoal);

export default router;
