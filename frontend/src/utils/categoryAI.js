export const CATEGORY_KEYWORDS = {
  Salary: ["salary", "pay", "income", "credited"],
  Extra_Income: [
    "Bonus",
    "Incentive",
    "LTA claim",
    "Commision",
    "reward",
    "Medical claim",
  ],
  Freelance: ["freelance", "client", "project", "gig"],
  Investment: [
    "stock",
    "mutual",
    "sip",
    "crypto",
    "dividend",
    "Gold",
    "Silver",
  ],
  Food: ["zomato", "swiggy", "food", "restaurant", "dinner", "lunch"],
  Transport: ["uber", "ola", "bus", "metro", "taxi"],
  Shopping: ["amazon", "flipkart", "Meesho", "shopping", "clothes"],
  Entertainment: ["movie", "netflix", "spotify", "game"],
  Utilities: ["electricity", "bill", "water", "recharge"],
  Healthcare: ["doctor", "medicine", "hospital"],
  Housing: ["rent", "house", "maintenance"],
  Annual_Expense: [
    "Bike Insurance",
    "Health Insurance",
    "Bike PUC",
    "Birthday party",
    "one time expenses",
    "Emergency",
  ],
  Side_Hustles: ["Tuition Fees", "Other-income", "Save"],
  Kids_Needs: ["Kids clothes", "Baby Personal care Items"],
  Vehicle_Expenses: ["Petrol", "Services", "Fuel"],
  Personal_Care_Expenses: ["Gym", "Personal Care Items"],
  Dairy: ["Doodh", "dahi", "Paneer"],
  Junk_Food: ["Biscuits", "Namkeen", "Chips", "Cold drinks"],
  Grocery: ["Atta", "chawal", "Dal", "Oil", "Masale", "Fruits", "Vegetables"],
};

export const detectCategory = (description = "") => {
  const text = description.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((word) => text.includes(word))) {
      return category;
    }
  }

  return "Other";
};
