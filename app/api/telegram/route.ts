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
    const text = body.message.text.trim().toLowerCase()

    // 1. Check if user is linked
    const { data: deviceData } = await supabase
      .from('telegram_devices')
      .select('user_id')
      .eq('telegram_chat_id', chatId)
      .single()

    if (!deviceData) {
      await sendTelegramMessage(
        chatId, 
        "Welcome to docwallet! 💼\n\nPlease go to your website dashboard and enter this exact Chat ID to link your account:\n\n👉 " + chatId
      )
      return NextResponse.json({ status: 'ok' })
    }

    const userId = deviceData.user_id

    // ==========================================
    // 🚦 COMMAND INTERCEPTORS
    // ==========================================

    // COMMAND: /start
    if (text === '/start' || text === 'start') {
      await sendTelegramMessage(
        chatId, 
        "Welcome back to docwallet! 💼\n\nI'm ready to track your expenses. Log them naturally, for example:\n- 'Paid ₹250 for dinner'\n- 'Sent ₹500 to Rangu and ₹200 to Amma'\n\nType /help to see all commands."
      );
      return NextResponse.json({ status: 'ok' });
    }

    // COMMAND: /help
    if (text === '/help') {
      const helpMsg = `🤖 **docwallet Commands:**\n\n` +
        `📝 Just type naturally to log a transaction (e.g., "Paid 250 for lunch").\n\n` +
        `/recent - View your last 5 transactions\n` +
        `/summary - View this month's balance\n` +
        `/undo - Delete your last transaction\n` +
        `/help - Show this menu`;
      await sendTelegramMessage(chatId, helpMsg);
      return NextResponse.json({ status: 'ok' });
    }

    // COMMAND: /undo
    if (text === '/undo') {
      const { data: lastTx, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !lastTx) {
        await sendTelegramMessage(chatId, "🤷‍♂️ I couldn't find any recent transactions to undo.");
        return NextResponse.json({ status: 'ok' });
      }

      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', lastTx.id);

      if (deleteError) {
        await sendTelegramMessage(chatId, "❌ Error trying to undo: " + deleteError.message);
      } else {
        await sendTelegramMessage(chatId, `🗑️ **Undid your last entry!**\nDeleted: ${lastTx.type} | ₹${lastTx.amount} | ${lastTx.category}`);
      }
      return NextResponse.json({ status: 'ok' });
    }

    // COMMAND: /recent
    if (text === '/recent') {
      const { data: recentTxs, error: recentError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentError || !recentTxs || recentTxs.length === 0) {
        await sendTelegramMessage(chatId, "📭 You don't have any recent transactions.");
        return NextResponse.json({ status: 'ok' });
      }

      let recentMsg = "🕒 **Your Last 5 Transactions:**\n\n";
      recentTxs.forEach((tx, index) => {
        const icon = tx.type.toLowerCase() === 'income' ? '🟢' : '🔴';
        recentMsg += `${index + 1}. ${icon} ${tx.type} | ₹${tx.amount} | ${tx.category}\n`;
      });
      await sendTelegramMessage(chatId, recentMsg);
      return NextResponse.json({ status: 'ok' });
    }

    // COMMAND: /summary
    if (text === '/summary') {
      const now = new Date();
      // Get the first and last millisecond of the current month
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

      const { data: monthTxs, error: summaryError } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', userId)
        .gte('created_at', firstDay)
        .lte('created_at', lastDay);

      if (summaryError || !monthTxs || monthTxs.length === 0) {
        await sendTelegramMessage(chatId, "📊 **This Month's Summary:**\nYou haven't logged any transactions this month.");
        return NextResponse.json({ status: 'ok' });
      }

      let totalIncome = 0;
      let totalExpense = 0;

      monthTxs.forEach(tx => {
        if (tx.type.toLowerCase() === 'income') totalIncome += Number(tx.amount);
        if (tx.type.toLowerCase() === 'expense') totalExpense += Number(tx.amount);
      });

      const balance = totalIncome - totalExpense;
      const balanceIcon = balance >= 0 ? '💰' : '⚠️';

      let summaryMsg = `📊 **This Month's Summary:**\n\n`;
      summaryMsg += `🟢 Total Income: ₹${totalIncome}\n`;
      summaryMsg += `🔴 Total Expense: ₹${totalExpense}\n`;
      summaryMsg += `------------------------\n`;
      summaryMsg += `${balanceIcon} **Net Balance: ₹${balance}**\n`;

      await sendTelegramMessage(chatId, summaryMsg);
      return NextResponse.json({ status: 'ok' });
    }

    // ==========================================
    // 🧠 AI PROCESSING (For normal messages)
    // ==========================================

    // Tell the user we are typing...
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
    })

    // --- REDUNDANCY ENGINE: TRY GROQ, FALLBACK TO GEMINI ---
    let aiResult;
    try {
      aiResult = await processWithGroq(body.message.text); // Send original casing to AI
    } catch (groqError: any) {
      console.warn("Groq failed:", groqError.message);
      
      try {
        aiResult = await processWithGemini(body.message.text);
      } catch (geminiError: any) {
        console.error("Both AI engines failed!");
        await sendTelegramMessage(chatId, `🚨 DEBUG LOG 🚨\n\n**Groq Error:**\n${groqError.message}\n\n**Gemini Error:**\n${geminiError.message}`);
        return NextResponse.json({ status: 'ok' });
      }
    }

    const transactions = aiResult.transactions || [];

    if (transactions.length === 0) {
      await sendTelegramMessage(chatId, "I couldn't find any financial amounts in that message. Please try again!");
      return NextResponse.json({ status: 'ok' });
    }

    let successMessage = "";
    let savedCount = 0;

    for (const tx of transactions) {
      if (tx.type === 'UNKNOWN') {
        await sendTelegramMessage(chatId, `❓ For ₹${tx.amount}, please specify if it was an Income or Expense. (e.g., 'Spent ₹${tx.amount} on food')`);
        continue; 
      }

      const { error: insertError } = await supabase
        .from('transactions')
        .insert([{
          user_id: userId,
          type: tx.type,
          amount: tx.amount,
          category: tx.category,
          entity_source: tx.entity_source,
          raw_text: body.message.text
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
