import React, { useState, useRef } from "react";
import { Transaction, OcrResult, PLAYFUL_CATEGORIES } from "../types";
import { 
  Plus, 
  Sparkles, 
  UploadCloud, 
  Brain, 
  HelpCircle, 
  AlertCircle, 
  FileCheck, 
  RotateCcw,
  BadgeAlert,
  Loader,
  X
} from "lucide-react";

interface ExpenseFormProps {
  onAddTransaction: (transaction: Omit<Transaction, "id">) => void;
  categories: string[];
}

export default function ExpenseForm({ onAddTransaction, categories }: ExpenseFormProps) {
  // Manual transaction form states
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState("Yummies & Brews");
  const [playfulNote, setPlayfulNote] = useState("");

  // AI manual categorization tracking
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);

  // OCR screenshot states
  const [isOcrAnalyzing, setIsOcrAnalyzing] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Call server to auto-categorize manual entry
  const handleAiAutoCategorize = async () => {
    if (!description.trim()) {
      alert("Please type a description first so the model can analyze! 🍔");
      return;
    }

    setIsCategorizing(true);
    setAiNote(null);
    try {
      const response = await fetch("/api/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description,
          amount: amount,
          currentCategories: categories,
        }),
      });

      if (!response.ok) {
        throw new Error("Local categorizer responded with an error");
      }

      const data = await response.json();
      if (data.category) {
        // Find if this category exists in our current list, otherwise default or add it
        const catMatch = PLAYFUL_CATEGORIES.find(
          c => c.name.toLowerCase() === data.category.toLowerCase()
        );
        if (catMatch) {
          setCategory(catMatch.name);
        } else {
          setCategory(data.category);
        }
        
        if (data.playfulNote) {
          setPlayfulNote(data.playfulNote);
          setAiNote(`🤖 Auto-Categorized: "${data.playfulNote}"`);
        }
      }
    } catch (err: any) {
      console.error(err);
      setAiNote("⚠️ Couldn't contact the classification brain. Let's pick manual category!");
    } finally {
      setIsCategorizing(false);
    }
  };

  // Submit manual transaction
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!description || isNaN(parsedAmount) || parsedAmount <= 0) return;

    onAddTransaction({
      description,
      amount: parsedAmount,
      currency,
      date,
      category,
      playfulNote: playfulNote || "Custom ledger logging!",
      paymentMethod: "Manual Input",
      isAIProcessed: !!aiNote,
    });

    // Reset
    setDescription("");
    setAmount("");
    setPlayfulNote("");
    setAiNote(null);
  };

  // Convert uploaded image to base64 and process
  const processImageFile = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setOcrError("Whoops! That doesn't look like an image. Drop a payment screenshot! 📸");
      return;
    }

    setIsOcrAnalyzing(true);
    setOcrError(null);
    setOcrResult(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Data = reader.result as string;
      try {
        const response = await fetch("/api/ocr-screenshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64Image: base64Data,
            mimeType: file.type,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "OCR reading failed");
        }

        const parsedResult = await response.json();
        setOcrResult(parsedResult);
      } catch (err: any) {
        setOcrError(err.message || "Failed to parse Google Pay screenshot. Please use a clearer image.");
      } finally {
        setIsOcrAnalyzing(false);
      }
    };
    reader.onerror = () => {
      setOcrError("Critical error loading image. Let's try again!");
      setIsOcrAnalyzing(false);
    };
  };

  // Drag and drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Accept OCR parsed transaction
  const handleAcceptOcr = () => {
    if (!ocrResult) return;
    
    // Check if category is standard
    let finalCat = ocrResult.category;
    const isStandard = PLAYFUL_CATEGORIES.some(c => c.name.toLowerCase() === finalCat.toLowerCase());
    if (!isStandard) {
      // Pick best fit
      if (finalCat.toLowerCase().includes("food") || finalCat.toLowerCase().includes("drink") || finalCat.toLowerCase().includes("coffee")) {
        finalCat = "Yummies & Brews";
      } else if (finalCat.toLowerCase().includes("shop") || finalCat.toLowerCase().includes("clothing")) {
        finalCat = "Goodies & Shopping";
      } else if (finalCat.toLowerCase().includes("cab") || finalCat.toLowerCase().includes("ride") || finalCat.toLowerCase().includes("drive")) {
        finalCat = "Drives & Rides";
      } else {
        finalCat = "Other Stuff";
      }
    }

    onAddTransaction({
      description: ocrResult.merchant,
      amount: ocrResult.amount,
      currency: ocrResult.currency || "USD",
      date: ocrResult.date || new Date().toISOString().split("T")[0],
      category: finalCat,
      playfulNote: ocrResult.playfulSuggestion || "Parsed via Gemini Scan Scan! 🤖",
      paymentMethod: "Google Pay OCR",
      isAIProcessed: true,
    });

    // Reset OCR Card
    setOcrResult(null);
  };

  return (
    <div id="expense-form-section" className="grid grid-cols-1 lg:grid-cols-2 gap-8 my-6">
      
      {/* 🧾 Manual Input Card */}
      <div id="manual-expense-card" className="bg-white border-4 border-[#2D3436] rounded-[32px] p-6 shadow-[8px_8px_0px_0px_#2D3436]">
        <h3 className="font-sans font-black text-[#2D3436] text-xl flex items-center gap-2 mb-1">
          <span>✍️ Manual Transaction Logging</span>
        </h3>
        <p className="text-xs font-bold text-slate-500 mb-5">Logging made playful! Fill the fields or let Gemini guess categories.</p>
 
        <form id="expense-manual-form" onSubmit={handleManualSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-black text-[#2D3436] mb-1.5 uppercase tracking-wider">What did you splurge on?</label>
              <div className="flex gap-2">
                <input
                  id="tx-desc-input"
                  type="text"
                  placeholder="e.g., Cafe latte, gaming headset..."
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs font-bold text-[#2D3436] bg-[#FFF9F2]/50 hover:bg-[#FFF9F2] focus:bg-white border-2 border-[#2D3436] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-4 focus:ring-[#FF7675]/30 transition-all font-sans"
                />
                
                {/* AI guessing button */}
                <button
                  id="ai-guess-btn"
                  type="button"
                  onClick={handleAiAutoCategorize}
                  disabled={isCategorizing || !description}
                  className="bg-[#FFEAA7] border-2 border-[#2D3436] text-[#2D3436] font-black text-xs px-4 py-2 rounded-xl transition-all shadow-[3px_3px_0px_0px_#2D3436] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_#2D3436] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_0px_#2D3436] flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  title="Let Gemini predict category & give playful note"
                >
                  {isCategorizing ? (
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Brain className="w-3.5 h-3.5 text-[#FF7675]" />
                  )}
                  <span>Predict 🧠</span>
                </button>
              </div>
              {aiNote && (
                <p className="text-[11px] font-bold text-[#2D3436] mt-2 bg-[#81ECEC]/30 border-2 border-[#2D3436] px-3 py-1.5 rounded-xl">
                  {aiNote}
                </p>
              )}
            </div>
 
            {/* Amount */}
            <div>
              <label className="block text-[11px] font-black text-[#2D3436] mb-1.5 uppercase tracking-wider">Spend Total</label>
              <div className="relative">
                <span className="absolute left-3 top-3.5 text-xs font-black text-[#2D3436]">{currency === "INR" ? "₹" : "$"}</span>
                <input
                  id="tx-amount-input"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full text-xs font-black text-[#2D3436] bg-[#FFF9F2]/50 hover:bg-[#FFF9F2] focus:bg-white border-2 border-[#2D3436] rounded-xl pl-8 pr-3 py-2.5 focus:outline-none focus:ring-4 focus:ring-[#FF7675]/30 transition-all font-mono"
                />
              </div>
            </div>
 
            {/* Currency Choice */}
            <div>
              <label className="block text-[11px] font-black text-[#2D3436] mb-1.5 uppercase tracking-wider">Currency</label>
              <select
                id="tx-currency-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full text-xs font-black text-[#2D3436] bg-[#FFF9F2]/50 hover:bg-[#FFF9F2] border-2 border-[#2D3436] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-4 focus:ring-[#FF7675]/30 transition-all cursor-pointer font-bold"
              >
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>
 
            {/* Category Select */}
            <div>
              <label className="block text-[11px] font-black text-[#2D3436] mb-1.5 uppercase tracking-wider">Playful Category</label>
              <select
                id="tx-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs font-black text-[#2D3436] bg-[#FFF9F2]/50 hover:bg-[#FFF9F2] border-2 border-[#2D3436] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-4 focus:ring-[#FF7675]/30 transition-all cursor-pointer font-bold"
              >
                {PLAYFUL_CATEGORIES.map(cat => (
                  <option key={cat.name} value={cat.name}>
                    {cat.emoji} {cat.name}
                  </option>
                ))}
              </select>
            </div>
 
            {/* Date Picker */}
            <div>
              <label className="block text-[11px] font-black text-[#2D3436] mb-1.5 uppercase tracking-wider">Splurge Date</label>
              <input
                id="tx-date-input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs font-bold text-[#2D3436] bg-[#FFF9F2]/50 hover:bg-[#FFF9F2] border-2 border-[#2D3436] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-4 focus:ring-[#FF7675]/30 transition-all font-sans cursor-pointer"
              />
            </div>
 
          </div>
 
          <div className="flex justify-end pt-3">
            <button
              id="tx-add-btn"
              type="submit"
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-[#FF7675] hover:bg-[#ff5d5c] border-2 border-[#2D3436] text-[#2D3436] font-black text-xs px-5 py-3 rounded-xl shadow-[4px_4px_0px_0px_#2D3436] hover:shadow-[5px_5px_0px_0px_#2D3436] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_0px_#2D3436] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Add Splurge Item</span>
            </button>
          </div>
        </form>
      </div>
 
      {/* 📸 Screenshot Scanning Robot (Google Pay OCR Section) */}
      <div id="ocr-expense-card" className="bg-[#55EFC4] border-4 border-[#2D3436] rounded-[32px] p-6 shadow-[8px_8px_0px_0px_#2D3436] flex flex-col justify-between text-[#2D3436]">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
            <h3 className="font-sans font-black text-[#2D3436] text-xl flex items-center gap-2">
              <span>📸 Screenshot Scanner</span>
            </h3>
            <span className="text-[9px] bg-white border-2 border-[#2D3436] text-[#2D3436] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse inline-block self-start">Gemini Powered</span>
          </div>
          <p className="text-xs font-bold text-emerald-950/80 mb-5">Drop any payment screenshot (Google Pay, Venmo, credit cards) for fast automatic parser!</p>
 
          {/* OCR Result Preview */}
          {ocrResult && (
            <div id="ocr-result-preview-card" className="mb-4 bg-white border-4 border-[#2D3436] rounded-2xl p-4 shadow-[4px_4px_0px_0px_#2D3436] animate-scaleUp">
              <div className="flex items-center justify-between border-b-2 border-slate-100 pb-2 mb-3">
                <span className="text-xs font-black text-[#2D3436] flex items-center gap-1.5">
                  <FileCheck className="w-5 h-5 text-emerald-500" />
                  <span>Scanner Read Successfully!</span>
                </span>
                <button 
                  id="close-ocr-preview"
                  onClick={() => setOcrResult(null)} 
                  className="text-gray-400 hover:text-gray-600 p-1 border border-transparent rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
 
              <div className="space-y-2.5 text-xs text-[#2D3436]">
                <div className="flex justify-between border-b border-dashed border-slate-100 pb-1.5">
                  <span className="font-bold text-slate-400">Recipient/Store</span>
                  <strong className="font-black text-[#2D3436] text-right">{ocrResult.merchant}</strong>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-100 pb-1.5">
                  <span className="font-bold text-slate-400">Extracted Amount</span>
                  <strong className="font-black text-[#2D3436] text-right font-mono">
                    {ocrResult.currency === "INR" || ocrResult.currency === "₹" ? "₹" : "$"}
                    {ocrResult.amount.toFixed(2)}
                  </strong>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-100 pb-1.5">
                  <span className="font-bold text-slate-400">Transaction Date</span>
                  <strong className="font-black text-[#2D3436] text-right">{ocrResult.date}</strong>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-100 pb-1.5">
                  <span className="font-bold text-slate-400">Suggested Category</span>
                  <span className="bg-[#FFEAA7] border border-[#2D3436] px-2 py-0.5 rounded font-black text-[10px]">{ocrResult.category}</span>
                </div>
                
                {ocrResult.playfulSuggestion && (
                  <div className="mt-3 bg-[#FFF9F2] border-2 border-[#2D3436] px-3 py-2 rounded-xl text-[11px] font-bold italic text-slate-700 text-center">
                    " {ocrResult.playfulSuggestion} "
                  </div>
                )}
 
                <div className="pt-3 flex gap-2 justify-end">
                  <button
                    id="ocr-reselect-btn"
                    onClick={() => {
                      setOcrResult(null);
                      triggerFileSelect();
                    }}
                    className="px-3 py-1.5 border-2 border-[#2D3436] text-[#2D3436] font-black rounded-lg hover:bg-slate-50 transition text-[11px]"
                  >
                    Scan Another
                  </button>
                  <button
                    id="ocr-accept-btn"
                    onClick={handleAcceptOcr}
                    className="px-4 py-1.5 bg-[#FF7675] hover:bg-[#ff5d5c] text-[#2D3436] font-black rounded-lg border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_#2D3436] hover:translate-y-[-1px] active:translate-y-[1px] transition"
                  >
                    Accept & Commit 👍
                  </button>
                </div>
              </div>
            </div>
          )}
 
          {/* Drag & Drop Zone */}
          {!ocrResult && (
            <div
              id="ocr-drag-drop-zone"
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
              className={`border-4 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                dragActive 
                  ? "bg-white/80 border-[#2D3436] scale-[0.99]" 
                  : "bg-white border-[#2D3436]/40 hover:bg-white hover:border-[#2D3436]"
              }`}
            >
              <input
                id="ocr-file-element"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
 
              {isOcrAnalyzing ? (
                <div className="py-4 animate-pulse">
                  <div className="relative w-12 h-12 mx-auto mb-3">
                    <Loader className="w-12 h-12 text-[#2D3436] animate-spin" />
                  </div>
                  <h4 className="font-extrabold text-sm text-[#2D3436]">Reading image via Gemini...</h4>
                  <p className="text-[10px] font-bold text-slate-600 mt-1 leading-relaxed">
                    Analyzing screenshots, payment successes, UPI tickers, and dates... 🤖
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-white w-14 h-14 rounded-2xl border-2 border-[#2D3436] shadow-[3px_3px_0px_0px_#2D3436] mx-auto flex items-center justify-center text-slate-400">
                    <UploadCloud className="w-7 h-7 text-[#FF7675]" />
                  </div>
                  <h4 className="font-black text-sm text-[#2D3436]">Drop payment screenshots!</h4>
                  <p className="text-[11px] font-bold text-slate-605">or click to browse local gallery (JPG, PNG)</p>
                  
                  <div className="pt-2 text-[10px] font-black bg-white border border-[#2D3436]/20 px-3 py-1 rounded-full inline-block max-w-xs mx-auto">
                    👉 Tip: Instant OCR categorization extracts values!
                  </div>
                </div>
              )}
            </div>
          )}
 
          {ocrError && (
            <div id="ocr-error-banner" className="mt-3 flex items-start gap-2 bg-white border-2 border-[#2D3436] text-rose-700 text-[11px] font-bold p-3 rounded-xl shadow-[3px_3px_0px_0px_#2D3436]">
              <BadgeAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <strong className="font-black block text-[#2D3436]">Parsing hiccup:</strong>
                <span>{ocrError}</span>
              </div>
            </div>
          )}
        </div>
 
        <div className="pt-4 mt-4 border-t-2 border-[#2D3436]/10 flex items-center justify-between text-[#2D3436] text-[10px] font-bold opacity-80">
          <span>Security status: Server-side secure sandbox</span>
          <span>Google Pay • Venmo • Cards</span>
        </div>
 
      </div>
 
    </div>
  );
}
