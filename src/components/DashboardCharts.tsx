import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { Transaction, PLAYFUL_CATEGORIES } from "../types";
import { convertAmount, getCurrencySymbol } from "../utils";
import { TrendingUp, Sparkles, AlertCircle, ShoppingBag, PiggyBank, Coffee } from "lucide-react";

interface DashboardChartsProps {
  transactions: Transaction[];
  onSetFilterCategory: (category: string | null) => void;
  selectedCategory: string | null;
  primaryCurrency: string;
}

export default function DashboardCharts({ 
  transactions, 
  onSetFilterCategory, 
  selectedCategory,
  primaryCurrency
}: DashboardChartsProps) {

  // Group by Category helper (converted to primaryCurrency)
  const categoryData = useMemo(() => {
    const groupings: Record<string, number> = {};
    
    // Initialise zero defaults
    PLAYFUL_CATEGORIES.forEach(cat => {
      groupings[cat.name] = 0;
    });

    transactions.forEach(t => {
      // Find matching category name or fallback to "Other Stuff"
      let foundName = "Other Stuff";
      const match = PLAYFUL_CATEGORIES.find(c => c.name.toLowerCase() === t.category.toLowerCase());
      if (match) {
        foundName = match.name;
      } else {
        foundName = t.category;
      }

      const amountInPrimary = convertAmount(t.amount, t.currency || "USD", primaryCurrency);
      groupings[foundName] = (groupings[foundName] || 0) + amountInPrimary;
    });

    return Object.entries(groupings)
      .map(([name, value]) => {
        const catConfig = PLAYFUL_CATEGORIES.find(c => c.name === name) || {
          emoji: "✨",
          color: "text-purple-500",
          bg: "bg-purple-100",
          border: "border-purple-200",
        };
        return {
          name,
          value: parseFloat(value.toFixed(2)),
          emoji: catConfig.emoji,
          color: catConfig.color,
        };
      })
      .filter(item => item.value > 0);
  }, [transactions, primaryCurrency]);

  // Group by Date for standard trend representation (converted to primaryCurrency)
  const trendData = useMemo(() => {
    // Sort transactions by date ascending
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const dailyMap: Record<string, number> = {};
    sorted.forEach(t => {
      const formattedDate = new Date(t.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const amountInPrimary = convertAmount(t.amount, t.currency || "USD", primaryCurrency);
      dailyMap[formattedDate] = (dailyMap[formattedDate] || 0) + amountInPrimary;
    });

    return Object.entries(dailyMap).map(([date, amount]) => ({
      date,
      amount: parseFloat(amount.toFixed(2)),
    }));
  }, [transactions, primaryCurrency]);

  // Insights generation (converted to primaryCurrency)
  const totalSpend = useMemo(() => {
    return transactions.reduce((sum, t) => sum + convertAmount(t.amount, t.currency || "USD", primaryCurrency), 0);
  }, [transactions, primaryCurrency]);

  const currencySymbol = useMemo(() => {
    return getCurrencySymbol(primaryCurrency);
  }, [primaryCurrency]);

  const insights = useMemo(() => {
    if (transactions.length === 0) return [];
    
    // Calculate fun equivalents
    // Premium Bubble Tea cup rough pricing (~$6 USD or ~450 INR)
    const teaPrice = primaryCurrency === "INR" ? 450 : 6;
    const burritoPrice = primaryCurrency === "INR font-black" ? 900 : 12;

    const bubbleTeaCount = Math.floor(totalSpend / teaPrice);
    const burritosCount = Math.floor(totalSpend / (primaryCurrency === "INR" ? 900 : 12));

    const list = [
      {
        icon: <Coffee className="w-5 h-5 text-amber-500" />,
        title: `The Equivalent Spent Index (${primaryCurrency})`,
        desc: `Your total spending of ${currencySymbol}${totalSpend.toFixed(2)} could get you roughly ${bubbleTeaCount || 1} cups of Premium Bubble Tea 🧋 or ${burritosCount || 1} double-sized spicy Burritos 🌯 based on your local currency index!`,
      }
    ];

    // Find highest category
    if (categoryData.length > 0) {
      const topCat = [...categoryData].sort((a, b) => b.value - a.value)[0];
      list.push({
        icon: <ShoppingBag className="w-5 h-5 text-rose-500" />,
        title: `King of your Wallet: ${topCat.name}`,
        desc: `You spent ${currencySymbol}${topCat.value.toFixed(2)} on '${topCat.name}' ${topCat.emoji}. That's ${Math.round((topCat.value / totalSpend) * 100)}% of your total outlays.`,
      });
    }

    // Savings encouragement
    const upperLimit = primaryCurrency === "INR" ? 40000 : 500;
    list.push({
      icon: <PiggyBank className="w-5 h-5 text-emerald-500" />,
      title: "Playful Advice",
      desc: totalSpend > upperLimit 
        ? "Your wallet is breathing slightly heavily! Let's divert some pennies to your target buckets below. You got this! 💪"
        : "Looking super tight with your budgets! Outstanding discipline, champ! Give yourself a high-five. 🌟",
    });

    return list;
  }, [transactions, totalSpend, categoryData, currencySymbol, primaryCurrency]);

  // Custom colors for Recharts pie cells
  const getCategoryColor = (name: string) => {
    switch (name) {
      case "Yummies & Brews": return "#f59e0b"; // amber-500
      case "Goodies & Shopping": return "#f43f5e"; // rose-500
      case "Drives & Rides": return "#0ea5e9"; // sky-500
      case "Fun & Chill": return "#6366f1"; // indigo-500
      case "Nest & Shelves": return "#10b981"; // emerald-500
      case "Health & Care": return "#14b8a6"; // teal-500
      default: return "#a855f7"; // purple-500
    }
  };

  if (transactions.length === 0) {
    return (
      <div id="charts-empty" className="bg-[#FFEAA7] border-4 border-[#2D3436] rounded-[32px] p-8 text-center max-w-lg mx-auto my-6 shadow-[8px_8px_0px_0px_#2D3436]">
        <Sparkles className="w-12 h-12 text-[#FF7675] mx-auto animate-bounce mb-3" />
        <h3 className="font-sans font-black text-xl text-[#2D3436]">Waiting for Delicious Data!</h3>
        <p className="font-sans font-bold text-slate-705 text-xs mt-2 leading-relaxed">
          Log some fun expenses or upload a payment screenshot above to generate charming interactive visual reports & playful breakdowns!
        </p>
      </div>
    );
  }

  return (
    <div id="charts-dashboard" className="grid grid-cols-1 lg:grid-cols-3 gap-8 my-6">
      
      {/* Category Breakdown (Pie Chart + Interactive Legend) */}
      <div id="chart-categories" className="lg:col-span-2 bg-[#FFF9F2] border-4 border-[#2D3436] rounded-[32px] p-6 shadow-[8px_8px_0px_0px_#2D3436]">
        <div className="flex flex-wrap items-center justify-between mb-4 gap-2 border-b-2 border-[#2D3436]/10 pb-4">
          <div>
            <h3 className="font-sans font-black text-[#2D3436] text-xl flex items-center gap-2">
              <span>🌈 Category Breakdown</span>
              {selectedCategory && (
                <span className="text-xs bg-[#81ECEC] border-2 border-[#2D3436] text-[#2D3436] font-black px-2.5 py-0.5 rounded-full shadow-[2px_2px_0px_0px_#2D3436]">
                  {selectedCategory}
                </span>
              )}
            </h3>
            <p className="text-xs font-bold text-slate-400">Tap category blocks to isolate splurge segments</p>
          </div>
          {selectedCategory && (
            <button 
              id="clear-filter-btn"
              onClick={() => onSetFilterCategory(null)}
              className="text-xs bg-white border-2 border-[#2D3436] text-[#2D3436] px-3 py-1.5 rounded-xl font-black shadow-[2px_2px_0px_0px_#2D3436] hover:translate-y-[-1px] active:translate-y-[1px] transition-all"
            >
              Clear Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Recharts Pie */}
          <div className="md:col-span-5 h-[230px] flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  animationDuration={700}
                >
                  {categoryData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getCategoryColor(entry.name)} 
                      stroke="#2D3436"
                      strokeWidth={2}
                      style={{ cursor: "pointer", filter: selectedCategory === entry.name ? "brightness(1.05)" : "none" }}
                      onClick={() => onSetFilterCategory(selectedCategory === entry.name ? null : entry.name)}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val: number) => [`${currencySymbol}${val.toFixed(2)}`, "Spent"]}
                  contentStyle={{ borderRadius: "16px", borderWidth: "3px", borderColor: "#2D3436", fontWeight: "900", color: "#2D3436" }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Summary */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Spend</span>
              <span className="text-2xl font-black font-sans text-[#2D3436]">{currencySymbol}{totalSpend.toFixed(0)}</span>
            </div>
          </div>

          {/* Custom Interactive Legend */}
          <div className="md:col-span-7 flex flex-col gap-3.5 max-h-[220px] overflow-y-auto pr-2">
            {categoryData.map((cat, idx) => {
              const isSelected = selectedCategory === cat.name;
              const percent = Math.round((cat.value / totalSpend) * 100);
              return (
                <button
                  key={cat.name}
                  onClick={() => onSetFilterCategory(isSelected ? null : cat.name)}
                  className={`flex items-center justify-between text-left p-3.5 rounded-2xl border-2 border-[#2D3436] transition-all text-xs font-black select-none cursor-pointer ${
                    isSelected 
                      ? "bg-[#FFEAA7] shadow-[3px_3px_0px_0px_#2D3436] translate-y-[-1px]" 
                      : "bg-white hover:bg-slate-50/50 shadow-[2px_2px_0px_0px_#2D3436]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-3.5 h-3.5 rounded-full shrink-0 border-2 border-[#2D3436]" 
                      style={{ backgroundColor: getCategoryColor(cat.name) }}
                    />
                    <span className="font-black text-[#2D3436] flex items-center gap-1.5">
                      <span>{cat.emoji}</span>
                      <span>{cat.name}</span>
                    </span>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span className="font-black text-[#2D3436]">{currencySymbol}{cat.value.toFixed(1)}</span>
                    <span className="font-black text-[#2D3436] text-[10px] bg-slate-100 border border-[#2D3436]/20 px-1.5 py-0.5 rounded shrink-0">{percent}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Spending Trend Line bar */}
      <div id="chart-trends" className="bg-white border-4 border-[#2D3436] rounded-[32px] p-6 shadow-[8px_8px_0px_0px_#2D3436]">
        <h3 className="font-sans font-black text-[#2D3436] text-xl flex items-center gap-2 mb-1">
          <span>📈 Spending History</span>
        </h3>
        <p className="text-xs font-bold text-slate-400 mb-4">Your daily spending trajectory</p>

        {trendData.length === 0 ? (
          <div className="h-[180px] flex items-center justify-center text-slate-400 text-xs font-bold">
            No daily data plotted yet
          </div>
        ) : (
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <XAxis 
                  dataKey="date" 
                  tickLine={false} 
                  axisLine={false} 
                  style={{ fontSize: "10px", fill: "#2D3436", fontWeight: "900" }}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  style={{ fontSize: "10px", fill: "#2D3436", fontWeight: "900" }}
                  width={30}
                />
                <Tooltip 
                  formatter={(val: number) => [`${currencySymbol}${val}`, "Spend"]}
                  contentStyle={{ borderRadius: "16px", borderWidth: "3px", borderColor: "#2D3436", fontWeight: "950" }}
                />
                <Bar 
                  dataKey="amount" 
                  fill="#FF7675" 
                  stroke="#2D3436"
                  strokeWidth={2}
                  radius={[8, 8, 0, 0]} 
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Fun Playful Insights Board */}
      <div id="chart-insights" className="lg:col-span-3 bg-[#FFEAA7] border-4 border-[#2D3436] rounded-[32px] p-6 shadow-[8px_8px_0px_0px_#2D3436]">
        <div className="flex items-center gap-3 mb-6 border-b-2 border-[#2D3436]/10 pb-4">
          <div className="p-2 rounded-xl bg-white border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_#2D3436] text-[#FF7675]">
            <Sparkles className="w-6 h-6 text-[#FF7675]" />
          </div>
          <div>
            <h4 className="font-sans font-black text-[#2D3436] text-xl">PennyWise Smart Insights</h4>
            <p className="text-xs font-bold text-slate-605">Fun comparative economics & suggestions compiled for your wallet</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {insights.map((insight, index) => (
            <div key={index} className="bg-white border-2 border-[#2D3436] p-4 rounded-2xl flex gap-3.5 shadow-[4px_4px_0px_0px_#2D3436]">
              <div className="shrink-0 p-2.5 h-12 w-12 rounded-xl bg-[#FFF9F2] border-2 border-[#2D3436] flex items-center justify-center shadow-[2px_2px_0px_0px_#2D3436]">
                {insight.icon}
              </div>
              <div>
                <h5 className="font-black text-xs text-[#2D3436] mb-1">{insight.title}</h5>
                <p className="text-xs font-semibold text-slate-500 leading-relaxed">{insight.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
