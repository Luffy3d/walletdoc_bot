import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Secure Backend Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN!

// Helper function to send Telegram messages
async function sendTelegramMessage(chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text }),
  })
}

// --- AI ENGINE 1: GROQ LLAMA-3 (PRIMARY) ---
async function processWithGroq(userText: string) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        { 
          role: "system", 
          content: `You are a strict JSON financial extraction bot. 
          Return ONLY a valid JSON object with a single key "transactions" containing an array of objects.
          Each object must have: type (strictly "Income", "Expense", or "UNKNOWN"), amount (number), category (string), entity_source (string).
          Rules:
          1. Handle shorthand numbers accurately (e.g., "10k" = 10000, "1.5k" = 1500, "5L" = 500000).
          2. For 'category', use the exact purpose stated in the text (e.g., 'webdevelopment', 'dinner'). DO NOT output 'unknown' if a purpose is stated.
          3. If the user lists multiple entries, create a separate object for EACH.
          4. If the user provides a number without ANY context (e.g., just "20000"), set type to "UNKNOWN".`
        },
        { 
          role: "user", 
          content: userText 
        }
      ],
      response_format: { type: "json_object" }
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Groq API Status ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch (parseError) {
    throw new Error(`Groq sent invalid JSON: ${data.choices[0].message.content}`);
  }
}

// --- AI ENGINE 2: GOOGLE GEMINI (BACKUP) ---
async function processWithGemini(userText: string) {
  const prompt = `You are a financial tracker. Extract transaction details from this text: "${userText}". 
  Return ONLY a valid JSON object with a single key "transactions" containing an array of objects.
  Each object must have:
  - "type": strictly "Income", "Expense", or "UNKNOWN"
  - "amount": number only (convert shorthand like 10k to 10000)
  - "category": string (e.g., Food, webdevelopment. NEVER use 'unknown' if the text explains what the money was for)
  - "entity_source": string (e.g., Uber, Amazon, Saravana)
  Rule: If there are multiple transactions, separate them into multiple objects.
  Do not include markdown tags like \`\`\`json.`

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API Status ${res.status}: ${errorText}`);
  }
  
  const data = await res.json();
  try {
    const rawJsonString = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
    return JSON.parse(rawJsonString);
  } catch (parseError) {
    throw new Error(`Gemini sent invalid JSON: ${data.candidates?.[0]?.content?.parts?.[0]?.text}`);
  }
}

// --- MAIN WEBHOOK HANDLER ---
export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    if (!body.message || !body.message.text) {
      return NextResponse.json({ status: 'ignored' })
    }

    const chatId = body.message.chat.id.toString()
    const text = body.message.text

    // FIX: 1. Check if user is linked in Supabase FIRST
    const { data: deviceData } = await supabase
      .from('telegram_devices')
      .select('user_id')
      .eq('telegram_chat_id', chatId)
      .single()

    // 2. If they are NOT linked, ALWAYS give them the Chat ID
    if (!deviceData) {
      await sendTelegramMessage(
        chatId, 
        "Welcome to docwallet! 💼\n\nPlease go to your website dashboard and enter this exact Chat ID to link your account:\n\n👉 " + chatId
      )
      return NextResponse.json({ status: 'ok' })
    }

    const userId = deviceData.user_id

    // 3. If they ARE linked, but they type /start, give them the tips
    if (text.trim().toLowerCase() === '/start' || text.trim().toLowerCase() === 'start') {
      await sendTelegramMessage(
        chatId, 
        "Welcome back to docwallet! 💼\n\nI'm ready to track your expenses. Log them naturally, for example:\n- 'Paid ₹250 for dinner'\n- 'Sent ₹500 to Rangu and ₹200 to Amma'"
      );
      return NextResponse.json({ status: 'ok' });
    }

    // Tell the user we are typing...
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
    })

    // ... (The rest of your AI Redundancy Engine code stays exactly the same below this) ...

    // --- REDUNDANCY ENGINE: TRY GROQ, FALLBACK TO GEMINI ---
    let aiResult;
    try {
      aiResult = await processWithGroq(text);
    } catch (groqError: any) {
      console.warn("Groq failed:", groqError.message);
      
      try {
        aiResult = await processWithGemini(text);
      } catch (geminiError: any) {
        console.error("Both AI engines failed!");
        await sendTelegramMessage(chatId, `🚨 DEBUG LOG 🚨\n\n**Groq Error:**\n${groqError.message}\n\n**Gemini Error:**\n${geminiError.message}`);
        return NextResponse.json({ status: 'ok' });
      }
    }

    // Ensure we have an array of transactions to process
    const transactions = aiResult.transactions || [];

    if (transactions.length === 0) {
      await sendTelegramMessage(chatId, "I couldn't find any financial amounts in that message. Please try again!");
      return NextResponse.json({ status: 'ok' });
    }

    let successMessage = "";
    let savedCount = 0;

    // Loop through the array (FIX 2: Handles multiple entries)
    for (const tx of transactions) {
      
      // FIX 3: Catch naked numbers
      if (tx.type === 'UNKNOWN') {
        await sendTelegramMessage(chatId, `❓ For ₹${tx.amount}, please specify if it was an Income or Expense. (e.g., 'Spent ₹${tx.amount} on food')`);
        continue; // Skip inserting this specific one into the database
      }

      // Insert into Supabase
      const { error: insertError } = await supabase
        .from('transactions')
        .insert([{
          user_id: userId,
          type: tx.type,
          amount: tx.amount,
          category: tx.category,
          entity_source: tx.entity_source,
          raw_text: text
        }])

      if (insertError) {
        await sendTelegramMessage(chatId, `❌ Error saving ₹${tx.amount}: ` + insertError.message)
      } else {
        savedCount++;
        successMessage += `✅ Saved: ${tx.type} | ₹${tx.amount} | ${tx.category}\n`;
      }
    }

    if (savedCount > 0) {
      await sendTelegramMessage(chatId, successMessage);
    }

    return NextResponse.json({ status: 'ok' })

  } catch (error: any) {
    console.error("Webhook Error:", error)
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 })
  }
}
