import { loadMemory, saveMemory } from "./categoryMemory";
import { detectCategory } from "./categoryAI";

export const smartDetectCategory = (text) => {
  const memory = loadMemory();
  const key = text.toLowerCase().trim();

  // 1. If we already learned this exact phrase → use it
  if (memory[key]) {
    return memory[key];
  }

  // 2. fallback to rule-based AI
  return detectCategory(text);
};

// Learn from user correction
export const learnCategory = (text, category) => {
  const memory = loadMemory();
  const key = text.toLowerCase().trim();

  memory[key] = category;

  saveMemory(memory);
};
