import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Secure Backend Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Must use Service Role key to bypass RLS in the background
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
      model: "llama3-8b-8192",
      messages: [
        { 
          role: "system", 
          content: "You are a JSON-only financial extraction bot. Return ONLY valid JSON with keys: type (Income/Expense), amount (number), category (string), entity_source (string). No extra text." 
        },
        { 
          role: "user", 
          content: userText 
        }
      ],
      response_format: { type: "json_object" }
    })
  });

  if (!res.ok) throw new Error("Groq API failed");

  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

// --- AI ENGINE 2: GOOGLE GEMINI (BACKUP) ---
async function processWithGemini(userText: string) {
  const prompt = `You are a financial tracker. Extract the transaction details from this text: "${userText}". 
  Return ONLY a valid JSON object with these exact keys:
  - "type": strictly "Income" or "Expense"
  - "amount": number only
  - "category": string (e.g., Food, Transport, Salary)
  - "entity_source": string (e.g., Uber, Amazon, Client Name)
  Do not include markdown tags like \`\`\`json.`

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!res.ok) throw new Error("Gemini API failed");
  
  const data = await res.json();
  const rawJsonString = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
  return JSON.parse(rawJsonString);
}

// --- MAIN WEBHOOK HANDLER ---
export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Ignore edits or non-message updates
    if (!body.message || !body.message.text) {
      return NextResponse.json({ status: 'ignored' })
    }

    const chatId = body.message.chat.id.toString()
    const text = body.message.text

    // Check if user is linked in Supabase
    const { data: deviceData } = await supabase
      .from('telegram_devices')
      .select('user_id')
      .eq('telegram_chat_id', chatId)
      .single()

    if (!deviceData) {
      await sendTelegramMessage(
        chatId, 
        "Welcome to docwallet! 💼\nPlease go to the website dashboard and enter this Chat ID to link your account:\n\n👉 **" + chatId + "**"
      )
      return NextResponse.json({ status: 'ok' })
    }

    const userId = deviceData.user_id

    // Tell the user we are typing...
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
    })

    // --- REDUNDANCY ENGINE: TRY GROQ, FALLBACK TO GEMINI ---
    let aiResult;
    try {
      aiResult = await processWithGroq(text);
    } catch (groqError) {
      console.warn("Groq busy or failed. Falling back to Gemini...");
      try {
        aiResult = await processWithGemini(text);
      } catch (geminiError) {
        console.error("Both AI engines failed!");
        await sendTelegramMessage(chatId, "⏳ Both of our AI engines are experiencing extreme traffic! Please try again in a minute.");
        return NextResponse.json({ status: 'ok' });
      }
    }

    // Insert into Supabase
    const { error: insertError } = await supabase
      .from('transactions')
      .insert([{
        user_id: userId,
        type: aiResult.type,
        amount: aiResult.amount,
        category: aiResult.category,
        entity_source: aiResult.entity_source,
        raw_text: text
      }])

    if (insertError) {
      await sendTelegramMessage(chatId, "❌ Error saving to database: " + insertError.message)
      return NextResponse.json({ status: 'ok' })
    }

    // Send Success Message
    const emoji = aiResult.type === 'Income' ? '🟢' : '🔴'
    await sendTelegramMessage(
      chatId, 
      `${emoji} Logged!\n\n${aiResult.type}: ₹${aiResult.amount}\nCategory: ${aiResult.category}\nSource: ${aiResult.entity_source || 'Unknown'}`
    )

    return NextResponse.json({ status: 'ok' })

  } catch (error: any) {
    console.error("Webhook Error:", error)
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 })
  }
}
