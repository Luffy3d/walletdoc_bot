import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
const { GoogleGenerativeAI } = require("@google/generative-ai");

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    // --- 1. DASHBOARD CONFIRMATION TRIGGER ---
    if (payload.action === 'confirm_link') {
      const { chatId, userEmail } = payload;
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `✅ *Link Confirmed!*\n\nWelcome to *docwallet*. Your Telegram account is now linked to ${userEmail}.\n\nType /profile to see your details or /summary for reports.`,
          parse_mode: 'Markdown'
        }),
      });
      return NextResponse.json({ ok: true });
    }

    const message = payload.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId = message.chat.id.toString(); // Convert to string for 'tci'
    const text = message.text?.toLowerCase();

    const sendBotMsg = async (msg: string, markup?: any) => {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown', reply_markup: markup }),
      });
    };

    // --- 2. COMMAND: /START ---
    if (text === '/start') {
      await sendBotMsg(`🩺 *Welcome to docwallet*\n\nYour Chat ID: \`${chatId}\`\n\nEnter this on your website dashboard to link your account.`);
      return NextResponse.json({ ok: true });
    }

    // --- 3. COMMAND: /PROFILE & PHONE CAPTURE ---
    if (text === '/profile' || message.contact) {
      const { data: user } = await supabase.from('users').select('*').eq('tci', chatId).single();
      
      if (!user) {
        await sendBotMsg("⚠️ Please link your Chat ID on the web dashboard first.");
      } else if (message.contact) {
        await supabase.from('users').update({ phone_number: message.contact.phone_number }).eq('tci', chatId);
        await sendBotMsg("✅ Phone number verified and saved to your profile!");
      } else if (!user.phone_number) {
        await sendBotMsg("📱 Your profile is missing a phone number. Tap below to share it securely.", {
          keyboard: [[{ text: "📱 Share My Number", request_contact: true }]],
          resize_keyboard: true, one_time_keyboard: true
        });
      } else {
        await sendBotMsg(`👤 *Profile Summary*\nName: ${user.full_name || 'Doctor'}\nReg ID: ${user.doctor_reg_id || 'N/A'}\nPhone: ${user.phone_number}\nStatus: Verified ✅`);
      }
      return NextResponse.json({ ok: true });
    }

    // --- 4. COMMAND: /SUMMARY ---
    if (text === '/summary') {
      await sendBotMsg("📊 *Select a report:*", {
        inline_keyboard: [
          [{ text: "📅 Last 7 Days Summary", callback_data: "report_week" }],
          [{ text: "⛽ Fuel Expense Total", callback_data: "report_fuel" }],
          [{ text: "💰 Monthly Income", callback_data: "report_income" }]
        ]
      });
      return NextResponse.json({ ok: true });
    }

    // --- 5. AI TRANSACTION LOGGING ---
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
      Extract financial data from: "${message.text}"
      Current Date: ${new Date().toLocaleDateString('en-IN')}
      Return JSON ONLY: { "amount": number, "type": "Income"|"Expense", "category": string, "date": "YYYY-MM-DD", "description": string }
    `;

    const result = await model.generateContent(prompt);
    const data = JSON.parse(result.response.text().replace(/```json|```/g, ""));

    // Save to 'transactions' table with the 'tci' link
    const { error } = await supabase.from('transactions').insert([{ 
      ...data, 
      tci: chatId 
    }]);

    if (error) throw error;

    await sendBotMsg(`📝 *Logged:* ${data.type} of ₹${data.amount} for ${data.category} on ${data.date}.`);

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("Bot Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
