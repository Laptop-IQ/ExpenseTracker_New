const STORAGE_KEY = "category_ai_memory";

export const loadMemory = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
};

export const saveMemory = (memory) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
};
