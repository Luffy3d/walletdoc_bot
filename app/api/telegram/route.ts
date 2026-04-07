import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Ensure environment variables exist to prevent build crashes
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(googleKey);

export async function POST(req: Request) {
  try {
    const payload: any = await req.json();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    // 1. Check for basic message structure
    const message = payload.message;
    if (!message || !message.chat) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id.toString();
    const text = message.text?.toLowerCase();

    const sendBotMsg = async (msg: string, markup?: any) => {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: chatId, 
          text: msg, 
          parse_mode: 'Markdown', 
          reply_markup: markup 
        }),
      });
    };

    // 2. Handle Profile / Contact sharing
    if (text === '/profile' || message.contact) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('tci', chatId)
        .single();

      if (!user || userError) {
        await sendBotMsg("⚠️ Please link your Chat ID on the dashboard first.");
      } else if (message.contact) {
        await supabase.from('users').update({ phone_number: message.contact.phone_number }).eq('tci', chatId);
        await sendBotMsg("✅ Phone number updated!");
      } else {
        await sendBotMsg(`👤 *Profile*\nName: ${user.full_name || 'Doctor'}\nPhone: ${user.phone_number || 'Not set'}`);
      }
      return NextResponse.json({ ok: true });
    }

    // 3. Handle Transaction Logging (Gemini 1.5/2.5)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Extract from: "${message.text}". Today: ${new Date().toLocaleDateString('en-IN')}. Return JSON: { "amount": number, "type": "Income"|"Expense", "category": string, "date": "YYYY-MM-DD" }`;

    const result = await model.generateContent(prompt);
    const data = JSON.parse(result.response.text().replace(/```json|```/g, ""));

    // Crucial: Use 'as any' to bypass strict TS check if columns aren't in your local types
    await (supabase.from('transactions') as any).insert([{ 
      ...data, 
      tci: chatId 
    }]);

    await sendBotMsg(`📝 *Logged:* ₹${data.amount} for ${data.category}`);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Build/Runtime Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
