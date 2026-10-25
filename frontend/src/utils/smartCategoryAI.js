import { loadMemory, saveMemory } from "./categoryMemory";
import { detectCategory } from "./categoryAI";

// same normalize everywhere
const normalizeKey = (text = "") =>
  text
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

// =========================
// 🧠 SMART DETECTION
// =========================
export const smartDetectCategory = (text) => {
  const memory = loadMemory();
  const key = normalizeKey(text);

  // 1. exact memory match
  if (memory[key]) {
    return {
      category: memory[key].category,
      confidence: 1,
      source: "memory_exact",
    };
  }

  // 2. partial memory match
  for (const savedKey in memory) {
    if (key.includes(savedKey)) {
      return {
        category: memory[savedKey].category,
        confidence: 0.9,
        source: "memory_partial",
      };
    }
  }

  // 3. fallback AI
  return detectCategory(text);
};

// =========================
// 🧠 LEARN FUNCTION
// =========================
export const learnCategory = (text, category) => {
  const memory = loadMemory();
  const key = normalizeKey(text);

  memory[key] = {
    category,
    learnedAt: Date.now(),
  };

  saveMemory(memory);
};
