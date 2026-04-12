// =========================
// 🧠 CATEGORY DATABASE
// =========================
export const CATEGORY_KEYWORDS = {
  Salary: ["salary", "pay", "income", "credited"],
  Extra_Income: [
    "bonus",
    "incentive",
    "lta claim",
    "commission",
    "reward",
    "medical claim",
  ],
  Freelance: ["freelance", "client", "project", "gig"],
  Investment: [
    "stock",
    "mutual",
    "sip",
    "crypto",
    "dividend",
    "gold",
    "silver",
  ],
  Food: ["zomato", "swiggy", "food", "restaurant", "dinner", "lunch", "meal"],
  Transport: ["uber", "ola", "bus", "metro", "taxi", "fuel", "ride"],
  Shopping: ["amazon", "flipkart", "meesho", "shopping", "clothes", "order"],
  Entertainment: ["movie", "netflix", "spotify", "game", "youtube premium"],
  Utilities: ["electricity", "bill", "water", "recharge", "wifi", "internet"],
  Healthcare: ["doctor", "medicine", "hospital", "pharmacy"],
  Housing: ["rent", "house", "maintenance", "flat"],
  Annual_Expense: ["insurance", "puc", "birthday", "emergency", "annual"],
  Side_Hustles: ["tuition", "other income", "side income", "freelance extra"],
  Kids_Needs: ["kids", "baby", "school", "children"],
  Vehicle_Expenses: ["petrol", "fuel", "service", "bike", "car"],
  Personal_Care_Expenses: ["gym", "salon", "skincare", "personal care"],
  Dairy: ["milk", "doodh", "dahi", "paneer"],
  Junk_Food: ["chips", "biscuits", "namkeen", "cold drink", "cola"],
  Grocery: ["atta", "rice", "dal", "oil", "masala", "vegetables", "fruits"],
};

// =========================
// 🔧 NORMALIZER
// =========================
const normalizeText = (text = "") =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// =========================
// 🧠 MAIN AI ENGINE (v3)
// =========================
export const detectCategory = (description = "") => {
  const text = normalizeText(description);

  const textWords = text.split(" ").filter(Boolean);

  let bestCategory = "Other";
  let bestScore = 0;
  let totalScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;

    for (const keyword of keywords) {
      const k = normalizeText(keyword);

      // 1. EXACT MATCH (strongest)
      if (text === k) {
        score += 5;
      }

      // 2. CONTAINS MATCH
      else if (text.includes(k)) {
        score += 3;
      }

      // 3. KEYWORD INSIDE TEXT WORD MATCH (SMART FIX)
      else {
        const keywordWords = k.split(" ").filter(Boolean);

        const matchCount = keywordWords.filter((w) =>
          textWords.includes(w),
        ).length;

        score += matchCount * 2;
      }
    }

    totalScore += score;

    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  // =========================
  // 🧯 SAFE FALLBACK
  // =========================
  if (bestScore < 2) {
    return {
      category: "Other",
      confidence: 0,
    };
  }

  return {
    category: bestCategory,
    confidence: Number((bestScore / (totalScore || 1)).toFixed(2)),
  };
};
