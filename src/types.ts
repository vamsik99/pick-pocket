export interface Transaction {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  category: string;
  playfulNote?: string;
  paymentMethod?: string;
  isAIProcessed?: boolean;
}

export interface SavingsBucket {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  color: string; // Tailwind color class or hex, e.g., 'bg-amber-400'
  iconName: string; // Lucide icon identifier
  isCompleted?: boolean;
  notes?: string;
  currency?: string; // Target currency, e.g., 'USD' or 'INR'
  deadline?: string; // Goal target deadline date, e.g., '2026-12-31'
}

export interface OcrResult {
  merchant: string;
  amount: number;
  currency: string;
  date: string;
  category: string;
  playfulSuggestion: string;
}

export const PLAYFUL_CATEGORIES = [
  { name: "Yummies & Brews", emoji: "🍔", color: "text-amber-500", bg: "bg-amber-100/50", border: "border-amber-200" },
  { name: "Goodies & Shopping", emoji: "🛍️", color: "text-rose-500", bg: "bg-rose-100/50", border: "border-rose-200" },
  { name: "Drives & Rides", emoji: "🚗", color: "text-sky-500", bg: "bg-sky-100/50", border: "border-sky-200" },
  { name: "Fun & Chill", emoji: "🎮", color: "text-indigo-500", bg: "bg-indigo-100/50", border: "border-indigo-200" },
  { name: "Nest & Shelves", emoji: "🏡", color: "text-emerald-500", bg: "bg-emerald-100/50", border: "border-emerald-200" },
  { name: "Health & Care", emoji: "💖", color: "text-teal-500", bg: "bg-teal-100/50", border: "border-teal-200" },
  { name: "Other Stuff", emoji: "✨", color: "text-purple-500", bg: "bg-purple-100/50", border: "border-purple-200" },
];
