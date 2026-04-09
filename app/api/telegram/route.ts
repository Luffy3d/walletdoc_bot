import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

// Tell Vercel never to cache this route
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    const payload: any = await req.json();

    if (!payload.message || !payload.message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = payload.message.chat.id.toString();
    const text = payload.message.text;
    const lowerText = text.toLowerCase();

    const sendBotMsg = async (msg: string) => {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown' }),
      });
    };

    if (lowerText === '/start') {
      await sendBotMsg(`Welcome to *docwallet*! 🩺\n\nYour Telegram Chat ID is: \`${chatId}\`\n\nPlease enter this ID on your dashboard to link your account.`);
      return NextResponse.json({ ok: true });
    }

    let { data: device } = await supabase
      .from('telegram_devices')
      .select('user_id')
      .eq('telegram_chat_id', chatId)
      .single();

    let userId = device?.user_id;

    if (!userId) {
      await sendBotMsg('❌ *Account Not Linked*\n\nPlease log in to the docwallet dashboard and link your Telegram account to start tracking transactions.');
      return NextResponse.json({ ok: true });
    }

    if (lowerText === '/undo') {
      const { data: lastTx } = await supabase
        .from('transactions')
        .select('id, amount, category')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (lastTx) {
        await supabase.from('transactions').delete().eq('id', lastTx.id);
        await sendBotMsg(`🗑️ *Deleted!* Removed your last entry: ₹${lastTx.amount} (${lastTx.category})`);
      } else {
        await sendBotMsg("I couldn't find any recent transactions to undo.");
      }
      return NextResponse.json({ ok: true });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `
      Extract ALL financial transaction details from the following text: "${text}"
      
      You MUST return a JSON ARRAY of objects. Even if there is only one transaction, put it inside an array [].
      Each object must have these exact fields:
      - amount (number)
      - type (string, strictly either "Income" or "Expense")
      - category (string, be HIGHLY SPECIFIC and preserve the context. E.g., instead of generic "Loan Repayment", use "Car EMI". Instead of generic "Vehicle", use "Bike Service" or "Car Fuel".)
      - entity_source (string, the recipient or sender, or the specific object involved if no person/company is named)

      If ambiguous, make your best guess. 
      Example outputs: 
      [
        {"amount": 22000, "type": "Expense", "category": "Car EMI", "entity_source": "Bank"},
        {"amount": 500, "type": "Expense", "category": "Food & Beverage", "entity_source": "Restaurant"}
      ]
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let jsonText = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    
    let parsedData: any[];
    try {
      parsedData = JSON.parse(jsonText);
      if (!Array.isArray(parsedData)) {
        parsedData = [parsedData];
      }
    } catch (e) {
      await sendBotMsg('I could not understand those financial details. Please try formatting it like: "Spent ₹500 on clinic supplies and received ₹1000 from John"');
      return NextResponse.json({ ok: true });
    }

    const insertData = parsedData.map((tx) => ({
      user_id: userId,
      type: tx.type,
      amount: tx.amount,
      category: tx.category,
      entity_source: tx.entity_source,
      raw_text: text
    }));

    const { error: txError } = await supabase.from('transactions').insert(insertData);

    if (txError) {
      console.error('Supabase error:', txError);
      await sendBotMsg("Sorry, I couldn't save those transactions. Please check your dashboard.");
    } else {
      let successMessage = `✅ *Saved ${parsedData.length} Transaction${parsedData.length > 1 ? 's' : ''}!*\n\n`;
      parsedData.forEach((tx) => {
        successMessage += `*${tx.type}:* ₹${tx.amount} (${tx.category})\n`;
      });
      await sendBotMsg(successMessage);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error handling telegram webhook:', error);
    return NextResponse.json({ ok: true }); 
  }
}
