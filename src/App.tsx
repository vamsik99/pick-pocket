import React, { useState, useEffect, useMemo } from "react";
import { Transaction, SavingsBucket, PLAYFUL_CATEGORIES } from "./types";
import ExpenseForm from "./components/ExpenseForm";
import SavingsBuckets from "./components/SavingsBuckets";
import DashboardCharts from "./components/DashboardCharts";
import { convertAmount, getCurrencySymbol } from "./utils";
import { 
  PiggyBank, 
  Search, 
  Trash2, 
  Sparkles, 
  Zap, 
  Coins, 
  HelpCircle, 
  Compass, 
  ArrowDownWideNarrow, 
  TrendingUp, 
  HeartHandshake, 
  Smile,
  LogOut,
  Calendar,
  AlertCircle,
  RotateCcw
} from "lucide-react";

// For clean slate requirement, these fallbacks are completely empty
const MOCK_TRANSACTIONS: Transaction[] = [];
const MOCK_BUCKETS: SavingsBucket[] = [];

// Rich default dataset loaded ONLY when user explicitly triggers 'Reset Demo Logs'
const DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: "tx-1",
    description: "Starbucks Triple Macchiato",
    amount: 6.50,
    currency: "USD",
    date: "2026-06-04",
    category: "Yummies & Brews",
    playfulNote: "Caffeine powered day of productivity! ☕",
    paymentMethod: "Google Pay OCR",
    isAIProcessed: true
  },
  {
    id: "tx-2",
    description: "Nintendo Switch Indie Game",
    amount: 19.99,
    currency: "USD",
    date: "2026-06-03",
    category: "Fun & Chill",
    playfulNote: "Leveling up on a cozy afternoon! 🎮",
    paymentMethod: "Manual Input",
    isAIProcessed: false
  },
  {
    id: "tx-3",
    description: "Cab ride to science center",
    amount: 1250.00,
    currency: "INR",
    date: "2026-06-02",
    category: "Drives & Rides",
    playfulNote: "Arrived securely and with style! 🚗",
    paymentMethod: "Manual Input",
    isAIProcessed: true
  },
  {
    id: "tx-4",
    description: "Cute holographic vinyl stickers",
    amount: 8.00,
    currency: "USD",
    date: "2026-06-01",
    category: "Goodies & Shopping",
    playfulNote: "Your laptop is smiling now! ✨",
    paymentMethod: "Google Pay OCR",
    isAIProcessed: true
  },
  {
    id: "tx-5",
    description: "Room Rental Share",
    amount: 25000.00,
    currency: "INR",
    date: "2026-05-28",
    category: "Nest & Shelves",
    playfulNote: "Shelter rent checks delivered! 🏡",
    paymentMethod: "Manual Input",
    isAIProcessed: false
  }
];

const DEMO_BUCKETS: SavingsBucket[] = [
  {
    id: "b-1",
    name: "Cozy Tokyo Roadtrip 🌸",
    targetAmount: 1800,
    currentAmount: 620,
    color: "bg-rose-400",
    iconName: "Vacation",
    currency: "USD",
    deadline: "2026-11-25"
  },
  {
    id: "b-2",
    name: "PS5 Console Upgrade 🎮",
    targetAmount: 400,
    currentAmount: 400,
    color: "bg-cyan-400",
    iconName: "Gaming",
    currency: "USD",
    deadline: "2026-08-15"
  },
  {
    id: "b-3",
    name: "Golden Retriever Fund 🐶",
    targetAmount: 85000,
    currentAmount: 25000,
    color: "bg-amber-400",
    iconName: "Pet",
    currency: "INR",
    deadline: "2027-01-01"
  }
];

const FUN_FINANCE_QUOTES = [
  "A budget is telling your money where to go instead of wondering where it went! 🗺️",
  "Legend says if you brew coffee at home, you could purchase a castle in 402 years! 🏰",
  "Savings are like healthy plants. Plant them today, stand under their cozy shade tomorrow! 🌴",
  "Treat your piggy bank like a cute hamster. Feed it tiny gold seeds every single day! 🐹",
  "Beware of little expenses; a tiny leak will sink a colossal submarine ship! 🚢",
  "Your wallet's favorite game is Hide and Seek. Keep it fully hiding in your pockets! 🙈",
  "Sometimes shopping is cheaper than psychiatry, but your spreadsheet disagrees! 📊"
];

export default function App() {
  // Sync state with localstorage
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const stored = localStorage.getItem("play_expense_transactions");
      return stored ? JSON.parse(stored) : MOCK_TRANSACTIONS;
    } catch {
      return MOCK_TRANSACTIONS;
    }
  });

  const [buckets, setBuckets] = useState<SavingsBucket[]>(() => {
    try {
      const stored = localStorage.getItem("play_expense_buckets");
      return stored ? JSON.parse(stored) : MOCK_BUCKETS;
    } catch {
      return MOCK_BUCKETS;
    }
  });

  // Primary Viewer/Calculation Currency (USD or INR)
  const [primaryCurrency, setPrimaryCurrency] = useState<string>(() => {
    return localStorage.getItem("play_primary_currency") || "USD";
  });

  // General Available Cash/Income Savings Pool
  const [savingsPool, setSavingsPool] = useState<number>(() => {
    const stored = localStorage.getItem("play_savings_pool");
    return stored ? parseFloat(stored) : 2500; // Starts at 2500 default
  });

  // Server Db load status to avoid racing/over-writing
  const [isLoadingServerDb, setIsLoadingServerDb] = useState(true);

  // Pool inputs
  const [poolAddInput, setPoolAddInput] = useState("");

  const [funnyQuoteIndex, setFunnyQuoteIndex] = useState(0);

  // Search & Filtering elements
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string | null>(null);
  const [selectedSortOption, setSelectedSortOption] = useState<"latest" | "highest" | "lowest">("latest");

  // Non-blocking UI confirmation states
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [txConfirmDeleteId, setTxConfirmDeleteId] = useState<string | null>(null);

  // Pull initial Database state from our backend Server DB
  useEffect(() => {
    async function loadBackendDb() {
      try {
        const res = await fetch("/api/db");
        if (res.ok) {
          const data = await res.json();
          if (data.transactions && data.transactions.length > 0) {
            setTransactions(data.transactions);
          }
          if (data.buckets && data.buckets.length > 0) {
            setBuckets(data.buckets);
          }
          if (typeof data.savingsPool === "number") {
            setSavingsPool(data.savingsPool);
          }
        }
      } catch (err) {
        console.warn("Could not retrieve backend state, using local stashes as backup:", err);
      } finally {
        setIsLoadingServerDb(false);
      }
    }
    loadBackendDb();
  }, []);

  // Rotating play quotes
  useEffect(() => {
    const idx = Math.floor(Math.random() * FUN_FINANCE_QUOTES.length);
    setFunnyQuoteIndex(idx);
  }, []);

  // Sync state to LocalStorage (as real-time backup check)
  useEffect(() => {
    localStorage.setItem("play_expense_transactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem("play_expense_buckets", JSON.stringify(buckets));
  }, [buckets]);

  useEffect(() => {
    localStorage.setItem("play_primary_currency", primaryCurrency);
  }, [primaryCurrency]);

  useEffect(() => {
    localStorage.setItem("play_savings_pool", savingsPool.toString());
  }, [savingsPool]);

  // Synchronize state to server-side JSON DB
  useEffect(() => {
    if (isLoadingServerDb) return;

    let isCurrent = true;
    async function syncToBackend() {
      try {
        await fetch("/api/db/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactions,
            buckets,
            savingsPool,
          }),
        });
      } catch (err) {
        console.error("Failed to sync state to server database:", err);
      }
    }

    const timerId = setTimeout(() => {
      if (isCurrent) {
        syncToBackend();
      }
    }, 450);

    return () => {
      isCurrent = false;
      clearTimeout(timerId);
    };
  }, [transactions, buckets, savingsPool, isLoadingServerDb]);

  // Calculations for total status header
  const statistics = useMemo(() => {
    // Sum converted spent totals based on primaryCurrency selection
    const totalSpentInPrimary = transactions.reduce((sum, tx) => {
      const converted = convertAmount(tx.amount, tx.currency || "USD", primaryCurrency);
      return sum + converted;
    }, 0);

    const currencySymbol = getCurrencySymbol(primaryCurrency);
    
    // Sum active savings goal progress converted to primary currency
    const activeSavingsInPrimary = buckets.reduce((sum, b) => {
      const bCurrency = b.currency || "USD";
      const converted = convertAmount(b.currentAmount, bCurrency, primaryCurrency);
      return sum + converted;
    }, 0);

    const completedMissions = buckets.filter(b => b.currentAmount >= b.targetAmount).length;

    return {
      totalSpent: totalSpentInPrimary,
      currencySymbol,
      activeSavings: activeSavingsInPrimary,
      completedMissions
    };
  }, [transactions, buckets, primaryCurrency]);

  // Add Income Cash to Savings Pool
  const handleAddToPool = (e: React.FormEvent) => {
    e.preventDefault();
    const sum = parseFloat(poolAddInput);
    if (isNaN(sum) || sum <= 0) return;
    setSavingsPool((prev) => parseFloat((prev + sum).toFixed(2)));
    setPoolAddInput("");
  };

  // Add Transaction
  const handleAddTransaction = (newTx: Omit<Transaction, "id">) => {
    const freshTx: Transaction = {
      ...newTx,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    setTransactions((prev) => [freshTx, ...prev]);
  };

  // Delete Transaction
  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
    setTxConfirmDeleteId(null);
  };

  // Add Bucket
  const handleAddBucket = (newBucket: Omit<SavingsBucket, "id">) => {
    const freshBucket: SavingsBucket = {
      ...newBucket,
      id: `b-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    setBuckets((prev) => [...prev, freshBucket]);
  };

  // Dedicate/Withdraw capital between available Savings Pool and Goal Buckets
  const handleAllocateGoalCash = (bucketId: string, amountToMove: number, direction: "to_bucket" | "from_bucket") => {
    const bucket = buckets.find(b => b.id === bucketId);
    if (!bucket) return;
    const bCurrency = bucket.currency || "USD";

    // Value translated to the Main General Savings Pool currency representation (primaryCurrency)
    const amountInPrimary = convertAmount(amountToMove, bCurrency, primaryCurrency);

    if (direction === "to_bucket") {
      if (amountInPrimary > savingsPool) {
        alert(`Whoops! You only have ${getCurrencySymbol(primaryCurrency)}${savingsPool.toFixed(2)} left in your General Savings Pool. Deposit more income first! 💰`);
        return;
      }
      
      const targetAmountLeft = bucket.targetAmount - bucket.currentAmount;
      const actualMoveAmount = Math.min(amountToMove, targetAmountLeft);
      if (actualMoveAmount <= 0) {
        alert("This goal is already fully complete! 🎉");
        return;
      }

      const moveInPrimary = convertAmount(actualMoveAmount, bCurrency, primaryCurrency);

      setBuckets(prev => prev.map(b => b.id === bucketId ? { ...b, currentAmount: parseFloat((b.currentAmount + actualMoveAmount).toFixed(2)) } : b));
      setSavingsPool(prev => parseFloat(Math.max(0, prev - moveInPrimary).toFixed(2)));
    } else {
      const amountToWithdraw = Math.min(bucket.currentAmount, amountToMove);
      if (amountToWithdraw <= 0) return;

      const withdrawInPrimary = convertAmount(amountToWithdraw, bCurrency, primaryCurrency);

      setBuckets(prev => prev.map(b => b.id === bucketId ? { ...b, currentAmount: parseFloat(Math.max(0, b.currentAmount - amountToWithdraw).toFixed(2)) } : b));
      setSavingsPool(prev => parseFloat((prev + withdrawInPrimary).toFixed(2)));
    }
  };

  // Delete Bucket
  const handleDeleteBucket = (id: string) => {
    setBuckets((prev) => prev.filter((b) => b.id !== id));
  };

  // Refine list by query items
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Search query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (tx) =>
          tx.description.toLowerCase().includes(q) ||
          tx.category.toLowerCase().includes(q) ||
          (tx.playfulNote && tx.playfulNote.toLowerCase().includes(q))
      );
    }

    // Category click filters
    if (selectedFilterCategory) {
      result = result.filter(
        (tx) => tx.category.toLowerCase() === selectedFilterCategory.toLowerCase()
      );
    }

    // Sorting options
    if (selectedSortOption === "latest") {
      result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (selectedSortOption === "highest") {
      result.sort((a, b) => b.amount - a.amount);
    } else if (selectedSortOption === "lowest") {
      result.sort((a, b) => a.amount - b.amount);
    }

    return result;
  }, [transactions, searchQuery, selectedFilterCategory, selectedSortOption]);

  const uniqueCategories = useMemo(() => {
    // Unique list of categories in CURRENT ledger
    const list = new Set<string>();
    transactions.forEach(t => list.add(t.category));
    // Always include categories from config just in case
    PLAYFUL_CATEGORIES.forEach(c => list.add(c.name));
    return Array.from(list);
  }, [transactions]);

  // Clean wipe for demo resets
  const handleResetWipeAll = () => {
    // Generate deep copies of demo variables to prevent reference identical state skips in React 19
    const freshTransactions = JSON.parse(JSON.stringify(DEMO_TRANSACTIONS));
    const freshBuckets = JSON.parse(JSON.stringify(DEMO_BUCKETS));
    setTransactions(freshTransactions);
    setBuckets(freshBuckets);
    setSavingsPool(2500); // Give them some starting savings pool funds to play with!
    setSelectedFilterCategory(null);
    setSearchQuery("");
    setShowResetConfirm(false);
  };

  return (
    <div id="main-app-container" className="min-h-screen bg-[#FFF9F2] text-[#2D3436] flex flex-col selection:bg-[#FFEAA7] selection:text-[#2D3436]">
      
      {/* Playful Floating Announcement Stripe */}
      <div id="top-playful-stripe" className="bg-[#FFEAA7] text-[#2D3436] border-b-4 border-[#2D3436] px-4 py-2.5 font-mono text-center text-xs font-black flex items-center justify-center gap-2">
        <Sparkles className="w-4 h-4 text-[#FF7675] animate-bounce" />
        <span>Today's Playful Wisdom:</span>
        <span className="underline decoration-[#FF7675] decoration-2">"{FUN_FINANCE_QUOTES[funnyQuoteIndex]}"</span>
        <button 
          id="rotate-wisdom-btn"
          onClick={() => setFunnyQuoteIndex((prev) => (prev + 1) % FUN_FINANCE_QUOTES.length)}
          className="ml-2 bg-white hover:bg-slate-100 active:translate-y-0.5 border-2 border-[#2D3436] px-2 py-0.5 rounded-lg text-[10px] font-black shadow-[2px_2px_0px_0px_#2D3436] transition-all"
        >
          Next Quote 🎲
        </button>
      </div>

      <div className="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1 space-y-8">
        
        {/* Playful Header Section */}
        <header id="main-header" className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border-4 border-[#2D3436] rounded-[32px] p-6 shadow-[8px_8px_0px_0px_#2D3436]">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-[#FF7675] rounded-2xl border-2 border-[#2D3436] flex items-center justify-center text-white text-3xl font-black shadow-[4px_4px_0px_0px_#2D3436]">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-sans font-black text-3xl tracking-tight text-[#2D3436]">PickPocket<span className="text-[#FF7675]">.</span></h1>
                <span className="text-xs bg-[#81ECEC] border-2 border-[#2D3436] text-[#2D3436] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">v1.2</span>
              </div>
              <p className="text-xs font-bold text-slate-500 mt-1">Steals from your earnings, donates to your savings.</p>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto self-end md:self-center">
            
            {/* Primary Viewer Currency */}
            <div className="flex items-center gap-1.5 bg-white border-2 border-[#2D3436] px-3.5 py-2 rounded-xl shadow-[3px_3px_0px_0px_#2D3436]">
              <span className="text-[10px] font-black uppercase tracking-wide opacity-70">Viewer Currency:</span>
              <select
                id="header-primary-currency-select"
                value={primaryCurrency}
                onChange={(e) => setPrimaryCurrency(e.target.value)}
                className="text-xs font-black text-[#2D3436] bg-transparent focus:outline-none cursor-pointer outline-none"
              >
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>

            {/* Reset All Stats Panel (Click-twice state based confirmation) */}
            {showResetConfirm ? (
              <div className="flex items-center gap-1">
                <button
                  id="reset-demo-btn-confirm"
                  onClick={handleResetWipeAll}
                  className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-black px-4 py-2.5 rounded-xl border-2 border-[#2D3436] shadow-[3px_3px_0px_0px_#2D3436] transition-all"
                >
                  Sure? Reset! 🔥
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="text-xs font-black bg-white border-2 border-[#2D3436] hover:bg-slate-50 px-2.5 py-2.5 rounded-xl text-slate-400 hover:text-slate-600 transition"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                id="reset-demo-btn"
                onClick={() => setShowResetConfirm(true)}
                className="text-xs font-black text-[#2D3436] bg-white border-2 border-[#2D3436] px-4 py-2.5 rounded-xl shadow-[3px_3px_0px_0px_#2D3436] hover:shadow-[4px_4px_0px_0px_#2D3436] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_0px_#2D3436] transition-all flex items-center gap-1.5 cursor-pointer"
                title="Reset storage to default mockup values"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Demo Logs</span>
              </button>
            )}

          </div>
        </header>

        {/* Quick Bento Stats Overview Dashboard */}
        <section id="bento-overview-summary" className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Total Spend */}
          <div className="bg-[#A29BFE] rounded-[32px] border-4 border-[#2D3436] p-6 shadow-[8px_8px_0px_0px_#2D3436] flex items-center justify-between text-[#2D3436]">
            <div>
              <span className="text-[10px] text-[#2D3436] font-black uppercase tracking-widest block opacity-80">Total Cash Spent ({primaryCurrency})</span>
              <h2 className="text-4xl font-black mt-2">{statistics.currencySymbol}{statistics.totalSpent.toFixed(2)}</h2>
              <span className="text-[10px] font-black block mt-2 bg-white/40 border border-[#2D3436]/20 px-2 py-0.5 rounded inline-block">
                Across {transactions.length} splurge ledger logs
              </span>
            </div>
            <div className="p-3 bg-white rounded-2xl border-2 border-[#2D3436] shadow-[3px_3px_0px_0px_#2D3436]">
              <TrendingUp className="w-7 h-7 text-[#2D3436]" />
            </div>
          </div>

          {/* Card 2: Savings Progress */}
          <div className="bg-[#55EFC4] rounded-[32px] border-4 border-[#2D3436] p-6 shadow-[8px_8px_0px_0px_#2D3436] flex items-center justify-between text-[#2D3436]">
            <div>
              <span className="text-[10px] text-[#2D3436] font-black uppercase tracking-widest block opacity-80 font-bold">Goal Stash Progress ({primaryCurrency})</span>
              <h2 className="text-4xl font-black mt-2">{statistics.currencySymbol}{statistics.activeSavings.toFixed(2)}</h2>
              <span className="text-[10px] font-black block mt-2 bg-white/40 border border-[#2D3436]/20 px-2 py-0.5 rounded inline-block">
                Safeguarded in goals
              </span>
            </div>
            <div className="p-3 bg-white rounded-2xl border-2 border-[#2D3436] shadow-[3px_3px_0px_0px_#2D3436]">
              <Coins className="w-7 h-7 text-[#2D3436]" />
            </div>
          </div>

          {/* Card 3: General Unallocated Savings Pool */}
          <div className="bg-[#FFEAA7] rounded-[32px] border-4 border-[#2D3436] p-6 shadow-[8px_8px_0px_0px_#2D3436] flex flex-col justify-between text-[#2D3436] relative overflow-hidden">
            <div className="z-10">
              <span className="text-[10px] text-[#2D3436] font-black uppercase tracking-widest block opacity-80 font-bold">General Savings Pool ({primaryCurrency})</span>
              <h2 className="text-4xl font-black mt-1">{statistics.currencySymbol}{savingsPool.toFixed(2)}</h2>
              <p className="text-[10px] font-bold mt-1 text-slate-700">Unallocated cash ready to be partitioned into goals.</p>
            </div>
            
            {/* Direct Form to Add Income to general pool */}
            <form onSubmit={handleAddToPool} className="mt-4 flex gap-1.5 z-10 w-full">
              <input
                id="pool-deposit-amount"
                type="number"
                step="1"
                placeholder={`Add Income in ${primaryCurrency}`}
                value={poolAddInput}
                onChange={(e) => setPoolAddInput(e.target.value)}
                className="w-full text-xs font-black border-2 border-[#2D3436] rounded-xl px-2.5 py-1.5 bg-white focus:outline-none focus:ring-4 focus:ring-[#FF7675]/30 font-mono text-[#2D3436]"
              />
              <button
                id="add-to-pool-submit"
                type="submit"
                className="bg-[#55EFC4] hover:bg-[#4ddbb3] border-2 border-[#2D3436] text-[#2D3436] font-black text-xs px-3.5 py-1.5 rounded-xl shadow-[2px_2px_0px_0px_#2D3436] hover:translate-y-[-1px] active:translate-y-[1px] transition-all cursor-pointer whitespace-nowrap"
              >
                + Add 💰
              </button>
            </form>
            <span className="absolute bottom-[-20px] right-[-10px] text-7xl select-none opacity-10 pointer-events-none">
              🏦
            </span>
          </div>

        </section>

        {/* Expense Form Component (Manual logging + Drag-or-drop OCR screenshot scanner) */}
        <section id="inputs-workspace">
          <ExpenseForm 
            onAddTransaction={handleAddTransaction} 
            categories={uniqueCategories} 
          />
        </section>

        {/* Visual Charts Analytics Dashboard (Recharts pie/bar layout and custom advice) */}
        <section id="reports-analytics">
          <DashboardCharts 
            transactions={transactions} 
            selectedCategory={selectedFilterCategory}
            onSetFilterCategory={setSelectedFilterCategory}
            primaryCurrency={primaryCurrency}
          />
        </section>

        {/* Savings Buckets Goals Planner Panel */}
        <section id="savings-missions">
          <SavingsBuckets 
            buckets={buckets}
            onAddBucket={handleAddBucket}
            onDeleteBucket={handleDeleteBucket}
            onAllocateGoalCash={handleAllocateGoalCash}
            primaryCurrency={primaryCurrency}
            savingsPool={savingsPool}
          />
        </section>

        {/* Transaction History Logs lists */}
        <section id="history-section" className="bg-white border-4 border-[#2D3436] rounded-[32px] p-6 shadow-[8px_8px_0px_0px_#2D3436]">
          
          {/* Header & Controls mapping */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-slate-100 pb-5 mb-5">
            <div>
              <h3 className="font-sans font-black text-[#2D3436] text-xl flex items-center gap-1.5">
                <span>📓 Splurge Registry Ledger</span>
              </h3>
              <p className="text-xs font-bold text-slate-400">Search tags or tap categories inside the breakdown graph to isolate views</p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Search bar */}
              <div className="relative min-w-[200px] sm:min-w-[240px]">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  id="ledger-search"
                  type="text"
                  placeholder="Search recipient tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs font-black pl-9 pr-3 py-2.5 bg-slate-50 border-2 border-[#2D3436] text-[#2D3436] rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#FF7675]/30 transition"
                />
              </div>

              {/* Sort Dropdown */}
              <select
                id="ledger-sort-select"
                value={selectedSortOption}
                onChange={(e) => setSelectedSortOption(e.target.value as any)}
                className="text-xs font-black text-[#2D3436] bg-white border-2 border-[#2D3436] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-4 focus:ring-[#FF7675]/30 cursor-pointer"
              >
                <option value="latest">📅 Newest Splurges</option>
                <option value="highest">📈 Highest Spend first</option>
                <option value="lowest">📉 Lowest Spend first</option>
              </select>

              {/* Reset Category Filter link if active */}
              {selectedFilterCategory && (
                <button
                  id="reset-cat-filter-shortcut"
                  onClick={() => setSelectedFilterCategory(null)}
                  className="text-xs bg-[#81ECEC] hover:bg-[#74b9ff] text-[#2D3436] border-2 border-[#2D3436] font-black px-3.5 py-2 rounded-xl transition shadow-[2px_2px_0px_0px_#2D3436] active:translate-y-0.5"
                >
                  Clear Graph Category: {selectedFilterCategory}
                </button>
              )}
            </div>
          </div>

          {/* Transactions List */}
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-16 bg-[#FFF9F2] border-4 border-dashed border-[#2D3436] rounded-2xl">
              <Compass className="w-10 h-10 text-slate-400 mx-auto animate-pulse mb-2" />
              <p className="font-black text-[#2D3436] text-sm">No matching entries recorded!</p>
              <p className="text-slate-400 text-xs mt-1">Try relaxing searching keywords or clearing the category isolate graph filter click.</p>
              
              {(searchQuery || selectedFilterCategory) && (
                <button
                  id="clear-all-filters"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedFilterCategory(null);
                  }}
                  className="bg-[#FFEAA7] border-2 border-[#2D3436] px-4 py-2 rounded-xl text-xs font-black mt-3 shadow-[2px_2px_0px_0px_#2D3436] hover:translate-y-[-1px] active:translate-y-[1px] transition-all"
                >
                  Clear Active Filters
                </button>
              )}
            </div>
          ) : (
            <div id="ledger-transactions-list" className="space-y-4">
              {filteredTransactions.map((tx) => {
                const catInfo = PLAYFUL_CATEGORIES.find(c => c.name.toLowerCase() === tx.category.toLowerCase()) || {
                  emoji: "✨",
                  color: "text-purple-500",
                  bg: "bg-purple-100",
                  border: "border-purple-200"
                };

                return (
                  <div
                    key={tx.id}
                    id={`tx-row-${tx.id}`}
                    className="border-2 border-[#2D3436] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white text-[#2D3436] shadow-[4px_4px_0px_0px_#2D3436] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_0px_#2D3436] transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Playful Category Tag Icon */}
                      <div className="w-12 h-12 shrink-0 rounded-xl bg-slate-50 border-2 border-[#2D3436] flex items-center justify-center text-xl shadow-[2px_2px_0px_0px_#2D3436]">
                        {catInfo.emoji}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <h4 className="font-black text-[#2D3436] text-sm">{tx.description}</h4>
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider scale-95 border border-[#2D3436]/30 ${catInfo.bg} ${catInfo.color}`}>
                            {tx.category}
                          </span>
                          
                          {tx.isAIProcessed && (
                            <span className="text-[10px] bg-[#81ECEC] text-[#2D3436] border-2 border-[#2D3436] px-1.5 py-0.2 rounded font-black uppercase tracking-wide">
                              AI
                            </span>
                          )}
                        </div>

                        {/* Playful note text */}
                        <p className="text-xs text-gray-500 font-bold italic flex items-center gap-1 mt-0.5">
                          <span>🔮 "{tx.playfulNote || "Custom ledger logged"}"</span>
                        </p>

                        <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400 font-bold">
                          <span className="flex items-center gap-0.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {tx.date}
                          </span>
                          <span>•</span>
                          <span className="bg-slate-50 border border-slate-200 text-slate-500 px-1.5 py-0.2 rounded font-black text-[9px]">
                            {tx.paymentMethod || "Direct Input"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Spend indicator & Trash button */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 border-t-2 sm:border-t-0 border-[#2D3436]/10 pt-2 sm:pt-0">
                      <div className="flex flex-col items-start sm:items-end">
                        <span className="text-xl font-black text-[#FF7675]">
                          -{getCurrencySymbol(tx.currency)}
                          {tx.amount.toFixed(2)}
                        </span>
                        {tx.currency !== primaryCurrency && (
                          <span className="text-[10px] text-slate-400 font-bold opacity-80 mt-0.5">
                            ≈ {getCurrencySymbol(primaryCurrency)}
                            {convertAmount(tx.amount, tx.currency, primaryCurrency).toFixed(2)}
                          </span>
                        )}
                      </div>
                      
                      {txConfirmDeleteId === tx.id ? (
                        <div className="flex gap-1 items-center sm:mt-1.5">
                          <button
                            onClick={() => handleDeleteTransaction(tx.id)}
                            className="bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-[10px] px-2 py-1 rounded-md border-2 border-[#2D3436] shadow-[1px_1px_0px_0px_#2D3436] transition-all"
                          >
                            Sure? 🗑️
                          </button>
                          <button
                            onClick={() => setTxConfirmDeleteId(null)}
                            className="text-xs text-slate-400 hover:text-[#2D3436] px-1"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <button
                          id={`delete-tx-btn-${tx.id}`}
                          onClick={() => setTxConfirmDeleteId(tx.id)}
                          className="text-slate-350 hover:text-rose-500 border border-transparent hover:border-rose-300 hover:bg-rose-50 p-1.5 rounded-lg transition-all sm:mt-1.5"
                          title="Remove splurge item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* Table Count summary */}
          <div className="pt-4 mt-4 border-t-2 border-[#2D3436]/10 flex justify-between text-xs font-black text-slate-400">
            <span>Listing {filteredTransactions.length} of {transactions.length} items</span>
            {selectedFilterCategory && (
              <span>Isolated category view active</span>
            )}
          </div>

        </section>

      </div>

      {/* Playful Minimal footer credits */}
      <footer id="main-footer" className="bg-white border-t-4 border-[#2D3436] py-6 text-center text-xs font-black mt-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="flex items-center gap-1.5">
            <span>Made playfully with</span>
            <Smile className="w-4 h-4 text-[#FF7675] animate-bounce" />
            <span>& Bento Grid platform aesthetics</span>
          </p>
          <p>© 2026 Sandbox Finance Tracker • Under active local persistence</p>
        </div>
      </footer>

    </div>
  );
}
