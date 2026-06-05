import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Simple File DB constants
const DB_PATH = path.join(process.cwd(), "database.json");

const SEEDED_TRANSACTIONS = [
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

const SEEDED_BUCKETS = [
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

function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const initialDb = {
        transactions: SEEDED_TRANSACTIONS,
        buckets: SEEDED_BUCKETS,
        savingsPool: 2500,
      };
      fs.writeFileSync(DB_PATH, JSON.stringify(initialDb, null, 2), "utf8");
      return initialDb;
    }
    const data = fs.readFileSync(DB_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Database read error, using fallback defaults:", error);
    return {
      transactions: SEEDED_TRANSACTIONS,
      buckets: SEEDED_BUCKETS,
      savingsPool: 2500,
    };
  }
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Database write error:", error);
  }
}

// Increase JSON parser limit to support base64 screenshot uploads
app.use(express.json({ limit: "15mb" }));

// Initialize Gemini SDK with telemetry header
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not defined in the environment.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Playful categorization logic & fallback mapping
const FALLBACK_CATEGORIES: Record<string, string> = {
  uber: "Drives & Rides",
  lyft: "Drives & Rides",
  starbucks: "Yummies & Brews",
  cafe: "Yummies & Brews",
  coffee: "Yummies & Brews",
  mcdonald: "Yummies & Brews",
  burger: "Yummies & Brews",
  pizza: "Yummies & Brews",
  netflix: "Fun & Chill",
  spotify: "Fun & Chill",
  steam: "Fun & Chill",
  rent: "Nest & Shelves",
  roommate: "Nest & Shelves",
  electricity: "Nest & Shelves",
  gas: "Nest & Shelves",
  water: "Nest & Shelves",
  amazon: "Goodies & Shopping",
  walmart: "Goodies & Shopping",
  target: "Goodies & Shopping",
  groceries: "Yummies & Brews",
  supermarket: "Yummies & Brews",
  doctor: "Health & Care",
  pharmacy: "Health & Care",
  gym: "Health & Care",
};

// API: Categorize a manual text description
app.post("/api/categorize", async (req, res) => {
  try {
    const { description, amount, currentCategories } = req.body;
    if (!description) {
      return res.status(400).json({ error: "Description is required" });
    }

    const ai = getGeminiClient();
    if (!process.env.GEMINI_API_KEY) {
      // Local clean fallback when API key is not present
      const descLower = description.toLowerCase();
      let matchedCategory = "Goodies & Shopping";
      for (const [kw, cat] of Object.entries(FALLBACK_CATEGORIES)) {
        if (descLower.includes(kw)) {
          matchedCategory = cat;
          break;
        }
      }
      return res.json({
        category: matchedCategory,
        playfulNote: `Auto-categorized locally as '${matchedCategory}'! Try adding an API key to enable AI superpowers! 🚀`,
        confidence: 0.8,
      });
    }

    const categoriesList = currentCategories && currentCategories.length > 0 
      ? currentCategories.join(", ") 
      : "Yummies & Brews, Goodies & Shopping, Drives & Rides, Fun & Chill, Nest & Shelves, Health & Care, Uncategorized";

    const prompt = `Analyze this transaction:
Description: "${description}"
${amount ? `Amount: "${amount}"` : ""}

We have these spending categories: [${categoriesList}].
Please categorize this transaction into exactly one of these categories. If none fit perfectly, pick the closest one or create a fun appropriate fit.
Generate a very brief, playful, micro-sized human note (maximum 6 words) reacting to this expense (e.g. for coffee: "Caffeine powered day!", for netflix: "Binge season is back!").

Return a standard JSON object containing:
- category (string from the list if possible, or a new creative fitting one)
- playfulNote (string, max 6 words)
- confidence (number, 0.0 to 1.0)`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, description: "Highly appropriate category for the transaction" },
            playfulNote: { type: Type.STRING, description: "Playful reaction comment, max 6 words" },
            confidence: { type: Type.NUMBER, description: "Float between 0 and 1" }
          },
          required: ["category", "playfulNote", "confidence"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("AI Categorization failed: ", error);
    res.status(500).json({ error: "Failed to categorize transaction automatically: " + error.message });
  }
});

// API: Process screenshots of transactions using Gemini vision OCR
app.post("/api/ocr-screenshot", async (req, res) => {
  try {
    const { base64Image, mimeType } = req.body;
    if (!base64Image) {
      return res.status(400).json({ error: "Base64 image is required" });
    }

    const ai = getGeminiClient();
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({
        error: "GEMINI_API_KEY is not set. Please set your Gemini API key in Settings > Secrets to enable instant OCR screenshot reading! 📸",
      });
    }

    // Clean base64 string
    const cleanedBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/png",
        data: cleanedBase64,
      },
    };

    const prompt = `You are a friendly, playful financial scanner assistant.
Look closely at this payment screenshot (usually a Google Pay, UPI, Venmo, credit card alert, or bank transfer confirmation).
Please extract and analyze the transaction information.
Find:
1. The merchant or recipient name (e.g. Starbucks, Uber, John Doe, Google Play). Keep it clean and readable.
2. The monetary amount as a floating-point number (e.g. 15.50 or 500.0). Look for larger numbers signifying the total transaction, exclude balance.
3. The currency (e.g., USD, INR, EUR, fallback to USD if unclear or defaults).
4. The transaction date in 'YYYY-MM-DD' format. If unclear or not written, default to today's date "2026-06-05".
5. A playful category that fits the merchant. Make it fun, like "Yummies & Brews", "Goodies & Shopping", "Drives & Rides", "Fun & Chill", "Nest & Shelves", "Health & Care" or something silly if fits (e.g., custom fun category).
6. A tiny playful suggestion or warning about this purchase (e.g., "Your barista is smiling!", "Another Amazon box is arriving soon!"). Maximum 8 words.

Return a JSON response matching the schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [imagePart, prompt],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchant: { type: Type.STRING, description: "Name of the merchant/person paid" },
            amount: { type: Type.NUMBER, description: "Monetary amount spent, as float" },
            currency: { type: Type.STRING, description: "Currency code (USD, INR, EUR, etc.)" },
            date: { type: Type.STRING, description: "Date of transaction in Format YYYY-MM-DD" },
            category: { type: Type.STRING, description: "Fun, playful category" },
            playfulSuggestion: { type: Type.STRING, description: "Playful suggestion/note, max 8 words" },
          },
          required: ["merchant", "amount", "currency", "date", "category", "playfulSuggestion"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("Screenshot OCR failed: ", error);
    res.status(500).json({ error: "Failed to read screenshot. Please ensure it's a clear payment image! Error: " + error.message });
  }
});

// API: Get complete database (transactions, buckets, savingsPool)
app.get("/api/db", (req, res) => {
  try {
    const data = readDb();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to read database: " + error.message });
  }
});

// API: Sync complete database from client
app.post("/api/db/sync", (req, res) => {
  try {
    const { transactions, buckets, savingsPool } = req.body;
    const currentData = {
      transactions: transactions || [],
      buckets: buckets || [],
      savingsPool: typeof savingsPool === "number" ? savingsPool : 0,
    };
    writeDb(currentData);
    res.json({ success: true, message: "Database synchronized successfully" });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to sync database: " + error.message });
  }
});

// Serve frontend assets
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    // Vite middleware for development HMR-less builds
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Support Express v4 wildcards
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
