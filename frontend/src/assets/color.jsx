import {
  Utensils,
  Home,
  Car,
  ShoppingCart,
  Gift,
  Zap,
  PiggyBank,
  Banknote,
  Briefcase,
  TrendingUp,
  Fuel,
  Scissors,
  Baby,
  Shield,
  Milk,
  Wrench,
  Wallet,
  Coins,
  ShoppingBasket,
  Cookie,
  HeartPulse,
  IndianRupee,
} from "lucide-react";

export const GAUGE_COLORS = {
  Income: {
    gradientStart: "#0d9488",
    gradientEnd: "#0f766e",
    text: "text-teal-600",
    bg: "bg-teal-100",
  },
  Spent: {
    gradientStart: "#f97316",
    gradientEnd: "#ea580c",
    text: "text-orange-600",
    bg: "bg-orange-100",
  },
  Savings: {
    gradientStart: "#0891b2",
    gradientEnd: "#0e7490",
    text: "text-cyan-600",
    bg: "bg-cyan-100",
  },
};

export const COLORS = [
  "#0d9488",
  "#0f766e",
  "#0891b2",
  "#0e7490",
  "#f97316",
  "#ea580c",
  "#14b8a6",
];

export const INCOME_COLORS = [
  "#10b981",
  "#34d399",
  "#6ee7b7",
  "#a7f3d0",
  "#d1fae5",
];

export const CATEGORY_ICONS_Inc = {
  Salary: <Wallet className="w-4 h-4" />,
  Extra_Income: <Banknote className="w-4 h-4" />,
  Freelance: <Briefcase className="w-4 h-4" />,
  Investment: <TrendingUp className="w-4 h-4" />,
  Side_Hustles: <Coins className="w-4 h-4" />,

  // Essentials
  Food: <Utensils className="w-4 h-4" />,
  Grocery: <ShoppingBasket className="w-4 h-4" />,
  Dairy: <Milk className="w-4 h-4" />,
  Junk_Food: <Cookie className="w-4 h-4" />,

  Housing: <Home className="w-4 h-4" />,
  Transport: <Car className="w-4 h-4" />,
  Fuel: <Fuel className="w-4 h-4" />,

  Utilities: <Zap className="w-4 h-4" />,
  Healthcare: <HeartPulse className="w-4 h-4" />,
  Service: <Wrench className="w-4 h-4" />,

  Personal_Care_Expenses: <Scissors className="w-4 h-4" />,
  Kids_Needs: <Baby className="w-4 h-4" />,

  // Lifestyle
  Shopping: <ShoppingCart className="w-4 h-4" />,
  Entertainment: <Gift className="w-4 h-4" />,

  // Savings & expenses
  Savings: <PiggyBank className="w-4 h-4" />,
  Annual_Expense: <Shield className="w-4 h-4" />,

  Other: <IndianRupee className="w-4 h-4" />,
};

export const CATEGORY_ICONS = {
  Salary: <Wallet className="w-4 h-4" />,
  Extra_Income: <Banknote className="w-4 h-4" />,
  Freelance: <Briefcase className="w-4 h-4" />,
  Investment: <TrendingUp className="w-4 h-4" />,
  Side_Hustles: <Coins className="w-4 h-4" />,

  // Essentials
  Food: <Utensils className="w-4 h-4" />,
  Grocery: <ShoppingBasket className="w-4 h-4" />,
  Dairy: <Milk className="w-4 h-4" />,
  Junk_Food: <Cookie className="w-4 h-4" />,

  Housing: <Home className="w-4 h-4" />,
  Transport: <Car className="w-4 h-4" />,
  Fuel: <Fuel className="w-4 h-4" />,

  Utilities: <Zap className="w-4 h-4" />,
  Healthcare: <HeartPulse className="w-4 h-4" />,
  Service: <Wrench className="w-4 h-4" />,

  Personal_Care_Expenses: <Scissors className="w-4 h-4" />,
  Kids_Needs: <Baby className="w-4 h-4" />,

  // Lifestyle
  Shopping: <ShoppingCart className="w-4 h-4" />,
  Entertainment: <Gift className="w-4 h-4" />,

  // Savings & expenses
  Savings: <PiggyBank className="w-4 h-4" />,
  Annual_Expense: <Shield className="w-4 h-4" />,

  Other: <IndianRupee className="w-4 h-4" />,
};

// Enhanced category icons with more specific icons for income categories
export const INCOME_CATEGORY_ICONS = {
  Salary: <Wallet className="w-4 h-4" />,
  Extra_Income: <Banknote className="w-4 h-4" />,
  Freelance: <Briefcase className="w-4 h-4" />,
  Investment: <TrendingUp className="w-4 h-4" />,
  Side_Hustles: <Coins className="w-4 h-4" />,

  // Essentials
  Food: <Utensils className="w-4 h-4" />,
  Grocery: <ShoppingBasket className="w-4 h-4" />,
  Dairy: <Milk className="w-4 h-4" />,
  Junk_Food: <Cookie className="w-4 h-4" />,

  Housing: <Home className="w-4 h-4" />,
  Transport: <Car className="w-4 h-4" />,
  Fuel: <Fuel className="w-4 h-4" />,

  Utilities: <Zap className="w-4 h-4" />,
  Healthcare: <HeartPulse className="w-4 h-4" />,
  Service: <Wrench className="w-4 h-4" />,

  Personal_Care_Expenses: <Scissors className="w-4 h-4" />,
  Kids_Needs: <Baby className="w-4 h-4" />,

  // Lifestyle
  Shopping: <ShoppingCart className="w-4 h-4" />,
  Entertainment: <Gift className="w-4 h-4" />,

  // Savings & expenses
  Savings: <PiggyBank className="w-4 h-4" />,
  Annual_Expense: <Shield className="w-4 h-4" />,

  Other: <IndianRupee className="w-5 h-5 text-green-500" />,
};

export const EXPENSE_CATEGORY_ICONS = {
  Salary: <Wallet className="w-4 h-4" />,
  Extra_Income: <Banknote className="w-4 h-4" />,
  Freelance: <Briefcase className="w-4 h-4" />,
  Investment: <TrendingUp className="w-4 h-4" />,
  Side_Hustles: <Coins className="w-4 h-4" />,

  // Essentials
  Food: <Utensils className="w-4 h-4" />,
  Grocery: <ShoppingBasket className="w-4 h-4" />,
  Dairy: <Milk className="w-4 h-4" />,
  Junk_Food: <Cookie className="w-4 h-4" />,

  Housing: <Home className="w-4 h-4" />,
  Transport: <Car className="w-4 h-4" />,
  Fuel: <Fuel className="w-4 h-4" />,

  Utilities: <Zap className="w-4 h-4" />,
  Healthcare: <HeartPulse className="w-4 h-4" />,
  Service: <Wrench className="w-4 h-4" />,

  Personal_Care_Expenses: <Scissors className="w-4 h-4" />,
  Kids_Needs: <Baby className="w-4 h-4" />,

  // Lifestyle
  Shopping: <ShoppingCart className="w-4 h-4" />,
  Entertainment: <Gift className="w-4 h-4" />,

  // Savings & expenses
  Savings: <PiggyBank className="w-4 h-4" />,
  Annual_Expense: <Shield className="w-4 h-4" />,

  Other: <ShoppingCart className="w-5 h-5 text-orange-500" />,
};

export const colorClasses = {
  income: {
    bg: "bg-teal-100",
    text: "text-teal-600",
    border: "border-teal-200",
    ring: "ring-teal-500",
    button: "bg-teal-500 hover:bg-teal-600 text-white",
    iconBg: "bg-teal-100 text-teal-600",
  },
  expense: {
    bg: "bg-orange-100",
    text: "text-orange-600",
    border: "border-orange-200",
    ring: "ring-orange-500",
    button: "bg-orange-500 hover:bg-orange-600 text-white",
    iconBg: "bg-orange-100 text-orange-600",
  },
};
