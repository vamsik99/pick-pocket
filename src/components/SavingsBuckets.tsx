import React, { useState } from "react";
import { SavingsBucket } from "../types";
import { convertAmount, getCurrencySymbol } from "../utils";
import { 
  Plus, 
  Trash2, 
  Smile, 
  Coins, 
  Calendar,
  AlertCircle,
  Clock,
  Sparkles
} from "lucide-react";

interface SavingsBucketsProps {
  buckets: SavingsBucket[];
  onAddBucket: (bucket: Omit<SavingsBucket, "id">) => void;
  onDeleteBucket: (id: string) => void;
  onAllocateGoalCash: (bucketId: string, amountToMove: number, direction: "to_bucket" | "from_bucket") => void;
  primaryCurrency: string;
  savingsPool: number;
}

const AVAILABLE_COLORS = [
  { name: "Sunny Amber", bg: "bg-[#FFEAA7]", border: "border-[#2D3436]", text: "text-amber-800", lightBg: "bg-[#FFFDF6]" },
  { name: "Sky Surf Blue", bg: "bg-[#81ECEC]", border: "border-[#2D3436]", text: "text-teal-800", lightBg: "bg-[#F3FCFC]" },
  { name: "Retro Pink", bg: "bg-[#FF7675]", border: "border-[#2D3436]", text: "text-rose-900", lightBg: "bg-[#FFF5F5]" },
  { name: "Pandan Green", bg: "bg-[#55EFC4]", border: "border-[#2D3436]", text: "text-emerald-900", lightBg: "bg-[#F5FFF9]" },
  { name: "Cozy Lavender", bg: "bg-[#A29BFE]", border: "border-[#2D3436]", text: "text-indigo-900", lightBg: "bg-[#F7F6FF]" },
];

const AVAILABLE_ICONS = [
  { label: "🌴 Vacation", name: "Vacation" },
  { label: "🎮 Gaming", name: "Gaming" },
  { label: "🏡 Nest", name: "Nest" },
  { label: "🐶 Pet", name: "Pet" },
  { label: "🚲 Ride", name: "Ride" },
  { label: "🎓 Learn", name: "Learn" },
];

export default function SavingsBuckets({
  buckets,
  onAddBucket,
  onDeleteBucket,
  onAllocateGoalCash,
  primaryCurrency,
  savingsPool,
}: SavingsBucketsProps) {
  // Goals form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState<number | "">("");
  const [currentAmount, setCurrentAmount] = useState<number | "">("");
  const [color, setColor] = useState(AVAILABLE_COLORS[0].bg);
  const [iconName, setIconName] = useState("Vacation");
  const [currency, setCurrency] = useState("USD");
  const [deadline, setDeadline] = useState("");

  // Top-up modal/overlay simulation per-bucket
  const [activeTopUpId, setActiveTopUpId] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState("");

  // Delete confirm state
  const [bucketConfirmDeleteId, setBucketConfirmDeleteId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount || Number(targetAmount) <= 0) return;

    onAddBucket({
      name,
      targetAmount: Number(targetAmount),
      currentAmount: Number(currentAmount) || 0,
      color,
      iconName,
      currency,
      deadline: deadline || undefined,
    });

    // Reset Form
    setName("");
    setTargetAmount("");
    setCurrentAmount("");
    setColor(AVAILABLE_COLORS[0].bg);
    setIconName("Vacation");
    setCurrency(primaryCurrency);
    setDeadline("");
    setShowAddForm(false);
  };

  const handleTopUpSubmit = (bucketId: string) => {
    const sum = parseFloat(topUpAmount);
    if (isNaN(sum) || sum <= 0) return;

    onAllocateGoalCash(bucketId, sum, "to_bucket");
    setTopUpAmount("");
    setActiveTopUpId(null);
  };

  const handleWithdrawSubmit = (bucketId: string) => {
    const sum = parseFloat(topUpAmount);
    if (isNaN(sum) || sum <= 0) return;

    onAllocateGoalCash(bucketId, sum, "from_bucket");
    setTopUpAmount("");
    setActiveTopUpId(null);
  };

  // Helper inside the bento to calculate deadline countdown texts
  const getDeadlineText = (deadlineStr?: string) => {
    if (!deadlineStr) return { text: "No rush! 🕊️", isOverdue: false, urgencyClass: "bg-slate-50 text-slate-500" };

    const targetDate = new Date(deadlineStr);
    const today = new Date();
    // set times to midnight for accurate day calculations
    targetDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const formattedDate = targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    if (diffDays < 0) {
      return {
        text: `Overdue by ${Math.abs(diffDays)} days (${formattedDate}) ⏳`,
        isOverdue: true,
        urgencyClass: "bg-rose-100 text-rose-700 animate-pulse border border-rose-300"
      };
    } else if (diffDays === 0) {
      return {
        text: `Check-in deadline TODAY! ⏰`,
        isOverdue: false,
        urgencyClass: "bg-amber-100 text-amber-800 border border-amber-300"
      };
    } else if (diffDays <= 7) {
      return {
        text: `${diffDays} days left! (${formattedDate}) 🗓️`,
        isOverdue: false,
        urgencyClass: "bg-amber-50 text-amber-700 border border-amber-200"
      };
    } else {
      return {
        text: `${diffDays} days to target (${formattedDate})`,
        isOverdue: false,
        urgencyClass: "bg-emerald-50 text-emerald-700 border border-emerald-100"
      };
    }
  };

  return (
    <div id="savings-buckets-section" className="bg-[#FFEAA7] border-4 border-[#2D3436] rounded-[32px] p-6 shadow-[8px_8px_0px_0px_#2D3436] my-6 text-[#2D3436]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b-2 border-[#2D3436]/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white rounded-2xl border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_#2D3436] text-[#2D3436]">
            <Coins className="w-7 h-7 text-[#FF7675]" />
          </div>
          <div>
            <h3 className="font-sans font-black text-xl text-[#2D3436] flex items-center gap-1.5">
              <span>🎯 Custom Savings Goals</span>
              <Sparkles className="w-4 h-4 text-[#FF7675]" />
            </h3>
            <p className="text-xs font-bold text-slate-700">Dribble savings from your General Savings Pool of <span className="font-extrabold">{getCurrencySymbol(primaryCurrency)}{savingsPool.toFixed(2)}</span> into special target stashes!</p>
          </div>
        </div>
        {!showAddForm && (
          <button
            id="add-bucket-btn"
            onClick={() => {
              setCurrency(primaryCurrency);
              setShowAddForm(true);
            }}
            className="flex items-center gap-1.5 bg-white border-2 border-[#2D3436] text-[#2D3436] hover:bg-slate-50 text-xs font-black px-4 py-2.5 rounded-full shadow-[3px_3px_0px_0px_#2D3436] hover:shadow-[4px_4px_0px_0px_#2D3436] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_0px_#2D3436] transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Goal Bucket</span>
          </button>
        )}
      </div>

      {/* Add Bucket Form */}
      {showAddForm && (
        <form 
          id="add-bucket-form"
          onSubmit={handleSubmit} 
          className="bg-white border-4 border-[#2D3436] rounded-2xl p-5 mb-6 shadow-[4px_4px_0px_0px_#2D3436] text-[#2D3436]"
        >
          <div className="flex items-center justify-between mb-4 border-b-2 border-[#2D3436]/10 pb-2">
            <h4 className="font-black text-base text-[#2D3436] flex items-center gap-1.5">
              <span>🆕 Initiate Saving Mission</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs font-black text-slate-400 hover:text-[#2D3436] transition cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black text-[#2D3436] mb-1.5 uppercase tracking-wider">Goal / Mission Name</label>
              <input
                id="bucket-name-input"
                type="text"
                placeholder="e.g., PS5 Upgrade, Roadtrip to Kyoto 🌸"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full text-xs font-bold border-2 border-[#2D3436] rounded-xl px-3 py-2 bg-[#FFF9F2]/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#FF7675]/30 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-black text-[#2D3436] mb-1.5 uppercase tracking-wider">Target Goal Currency</label>
                <select
                  id="bucket-currency-select"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full text-xs font-black border-2 border-[#2D3436] rounded-xl px-3 py-2 bg-[#FFF9F2]/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#FF7675]/30 transition cursor-pointer"
                >
                  <option value="USD">USD ($)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black text-[#2D3436] mb-1.5 uppercase tracking-wider">Target Goal (Amount)</label>
                <input
                  id="bucket-target-input"
                  type="number"
                  placeholder="e.g., 500"
                  min="1"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value !== "" ? Number(e.target.value) : "")}
                  required
                  className="w-full text-xs font-black border-2 border-[#2D3436] rounded-xl px-3 py-2 bg-[#FFF9F2]/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#FF7675]/30 transition font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-[#2D3436] mb-1.5 uppercase tracking-wider">Starting Savings in goal (Optional)</label>
              <input
                id="bucket-current-input"
                type="number"
                placeholder="Defaults to 0"
                min="0"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value !== "" ? Number(e.target.value) : "")}
                className="w-full text-xs font-black border-2 border-[#2D3436] rounded-xl px-3 py-2 bg-[#FFF9F2]/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#FF7675]/30 transition font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-[#2D3436] mb-1.5 uppercase tracking-wider">Goal Target Deadline (Optional)</label>
              <input
                id="bucket-deadline-input"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full text-xs font-black border-2 border-[#2D3436] rounded-xl px-3 py-2 bg-[#FFF9F2]/50 focus:bg-[#FFF] focus:outline-none cursor-pointer focus:ring-4 focus:ring-[#FF7675]/30 transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-[#2D3436] mb-1.5 uppercase tracking-wider">Choose Theme Icon</label>
              <div className="grid grid-cols-3 gap-2">
                {AVAILABLE_ICONS.map((ico) => (
                  <button
                    key={ico.name}
                    type="button"
                    onClick={() => setIconName(ico.name)}
                    className={`px-2 py-1.5 rounded-xl border-2 transition-all font-bold text-center text-xs cursor-pointer ${
                      iconName === ico.name
                        ? "bg-[#FFEAA7] border-[#2D3436] text-[#2D3436] shadow-[2px_2px_0px_0px_#2D3436]"
                        : "border-[#2D3436]/20 bg-white hover:bg-slate-50 text-slate-500"
                    }`}
                  >
                    {ico.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-[#2D3436] mb-2 uppercase tracking-wider">Pick Splash Color Theme</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_COLORS.map((col) => (
                  <button
                    key={col.bg}
                    type="button"
                    onClick={() => setColor(col.bg)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-[11px] transition-all font-black cursor-pointer ${
                      color === col.bg
                        ? `${col.bg} border-[#2D3436] text-[#2D3436] shadow-[2px_2px_0px_0px_#2D3436]`
                        : `bg-white border-[#2D3436]/20 text-slate-600 hover:bg-slate-50`
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#2D3436]" />
                    {col.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border-2 border-[#2D3436] hover:bg-slate-50 text-[#2D3436] font-black rounded-xl transition cursor-pointer"
            >
              Close
            </button>
            <button
              id="submit-bucket-btn"
              type="submit"
              className="px-5 py-2 bg-[#FF7675] hover:bg-[#ff5d5c] border-2 border-[#2D3436] text-[#2D3436] font-black rounded-xl shadow-[2px_2px_0px_0px_#2D3436] hover:translate-y-[-1px] active:translate-y-[1px] transition cursor-pointer"
            >
              Start Mission ✨
            </button>
          </div>
        </form>
      )}

      {/* Buckets List */}
      {buckets.length === 0 ? (
        <div className="text-center py-10 bg-white border-4 border-[#2D3436] rounded-2xl shadow-[4px_4px_0px_0px_#2D3436] text-[#2D3436]">
          <Smile className="w-10 h-10 text-[#FF7675] mx-auto mb-2 animate-spin-slow" />
          <p className="font-black text-sm">No active goal buckets defined!</p>
          <p className="text-slate-500 text-xs mt-1.5 font-bold">Set goals, define target dates, and transfer money between unallocated savings and bucket milestones seamlessly. 💸</p>
        </div>
      ) : (
        <div id="buckets-display-grid" className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {buckets.map((bucket) => {
            const bucketCurrency = bucket.currency || "USD";
            const bSymbol = getCurrencySymbol(bucketCurrency);
            
            const progress = Math.min(
              100,
              Math.max(0, Math.round((bucket.currentAmount / bucket.targetAmount) * 100))
            );
            const isCompleted = bucket.currentAmount >= bucket.targetAmount;
            const deadlineInfo = getDeadlineText(bucket.deadline);

            return (
              <div
                key={bucket.id}
                id={`bucket-card-${bucket.id}`}
                className="bg-white border-4 border-[#2D3436] rounded-2xl p-4 flex flex-col justify-between shadow-[4px_4px_0px_0px_#2D3436] transition-all hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#2D3436] text-[#2D3436]"
              >
                {/* Header info */}
                <div>
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl filter drop-shadow-[1px_1px_0px_rgba(0,0,0,0.1)]">
                        {bucket.iconName === "Vacation" ? "🌴" : 
                         bucket.iconName === "Gaming" ? "🎮" :
                         bucket.iconName === "Nest" ? "🏡" :
                         bucket.iconName === "Pet" ? "🐶" :
                         bucket.iconName === "Ride" ? "🚲" : "🎓"}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-sm text-[#2D3436] truncate tracking-tight">{bucket.name}</h4>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          <span className="text-[8px] bg-slate-100 border border-slate-300 text-slate-600 px-1 rounded font-bold uppercase">
                            Goal In {bucketCurrency}
                          </span>
                          {isCompleted && (
                            <span className="text-[8px] bg-[#55EFC4] border border-[#2D3436] text-[#2D3436] px-1 rounded font-black uppercase">
                              COMPLETED! 🏆
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Double-Click State-Based Delete Button to fix the broken delete button */}
                    {bucketConfirmDeleteId === bucket.id ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            onDeleteBucket(bucket.id);
                            setBucketConfirmDeleteId(null);
                          }}
                          className="bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded border border-[#2D3436] shadow-[1px_1px_0px_rgba(0,0,0,0.35)]"
                        >
                          Sure?
                        </button>
                        <button
                          onClick={() => setBucketConfirmDeleteId(null)}
                          className="text-[9px] text-slate-400 font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <button
                        id={`delete-bucket-${bucket.id}`}
                        type="button"
                        onClick={() => setBucketConfirmDeleteId(bucket.id)}
                        className="text-slate-300 hover:text-rose-500 border border-transparent rounded hover:bg-slate-50 p-1 shrink-0 transition"
                        title="Delete bucket"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Deadline countdown */}
                  <div className={`mt-3.5 px-2.5 py-1 text-[10px] font-bold rounded-lg ${deadlineInfo.urgencyClass} flex items-center gap-1`}>
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="truncate">{deadlineInfo.text}</span>
                  </div>

                  {/* Progress bar and percentages */}
                  <div className="mt-4">
                    <div className="w-full h-3.5 bg-slate-100 border-2 border-[#2D3436] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${bucket.color} border-r-2 border-[#2D3436] transition-all duration-300`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    
                    <div className="flex flex-col gap-0.5 mt-2">
                      <p className="text-[10px] font-black uppercase opacity-90 text-[#2D3436]">
                        {progress}% Collected • {bSymbol}{bucket.currentAmount.toFixed(2)} of {bSymbol}{bucket.targetAmount.toFixed(2)}
                      </p>
                      
                      {/* Subtitle translated equivalent in primary viewer currency if different */}
                      {bucketCurrency !== primaryCurrency && (
                        <p className="text-[9px] text-slate-400 font-bold italic">
                          ≈ {getCurrencySymbol(primaryCurrency)}{convertAmount(bucket.currentAmount, bucketCurrency, primaryCurrency).toFixed(2)} of {getCurrencySymbol(primaryCurrency)}{convertAmount(bucket.targetAmount, bucketCurrency, primaryCurrency).toFixed(2)} base currency
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom top-up / withdraw panel */}
                <div className="mt-4 pt-3 border-t-2 border-[#2D3436]/10">
                  {activeTopUpId === bucket.id ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 w-full">
                        <input
                          id="topup-amount-input"
                          type="number"
                          step="1"
                          placeholder={`${bSymbol}`}
                          value={topUpAmount}
                          onChange={(e) => setTopUpAmount(e.target.value)}
                          className="w-18 h-8 text-xs font-black border-2 border-[#2D3436] rounded-lg px-1.5 text-center bg-[#FFF9F2] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleTopUpSubmit(bucket.id)}
                          className="flex-1 px-1.5 py-1.5 bg-[#55EFC4] border-2 border-[#2D3436] hover:bg-[#43dfb2] text-[#2D3436] text-[9px] font-black rounded-md shadow-[1px_1px_0px_0px_#2D3436] transition duration-100 cursor-pointer whitespace-nowrap"
                          title="Allocate cash from pool to this bucket"
                        >
                          Deduct Pool 📥
                        </button>
                        <button
                          type="button"
                          onClick={() => handleWithdrawSubmit(bucket.id)}
                          className="flex-1 px-1.5 py-1.5 bg-[#FF7675] border-2 border-[#2D3436] hover:bg-[#ff5d5c] text-[#2D3436] text-[9px] font-black rounded-md shadow-[1px_1px_0px_0px_#2D3436] transition duration-100 cursor-pointer whitespace-nowrap"
                          title="Return bucket savings back to main pool"
                        >
                          Return Pool 📤
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTopUpId(null);
                            setTopUpAmount("");
                          }}
                          className="text-xs font-black text-slate-400 hover:text-[#2D3436] px-1"
                        >
                          ×
                        </button>
                      </div>
                      
                      <p className="text-[9px] text-[#2D3436] font-bold opacity-75">
                        Transfers will convert automatically to/from your General Pool! 🏦
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-1 w-full">
                      <button
                        id={`open-topup-${bucket.id}`}
                        type="button"
                        onClick={() => {
                          setActiveTopUpId(bucket.id);
                          setTopUpAmount("");
                        }}
                        className="flex items-center justify-center gap-1 text-[10px] font-black bg-[#FFEAA7] border-2 border-[#2D3436] text-[#2D3436] hover:bg-white px-2 py-1.5 rounded-lg shadow-[2px_2px_0px_0px_#2D3436] hover:translate-y-[-1px] transition cursor-pointer shrink-0"
                      >
                        <Coins className="w-3.5 h-3.5 text-[#FF7675]" />
                        <span>Allocate capital 💸</span>
                      </button>
                      
                      {!isCompleted && (
                        <span className="text-[10px] font-black text-slate-500 text-right shrink-0">
                          Needed: {bSymbol}{(bucket.targetAmount - bucket.currentAmount).toFixed(0)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
