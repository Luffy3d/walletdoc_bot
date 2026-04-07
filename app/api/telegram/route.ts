import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

// CRITICAL FIX 1: Tell Vercel never to cache this route
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // CRITICAL FIX 2: Variables initialized inside POST for runtime evaluation
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    const payload: any = await req.json();

    // Ensure there is a message object
    const message = payload.message;
    if (!message) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id.toString();
    const text = message.text ? message.text.toLowerCase() : '';

    // Upgraded send function to handle buttons/markups
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

    // --- 1. /START COMMAND ---
    if (text === '/start') {
      await sendBotMsg(`Welcome to *docwallet*! 🩺\n\nYour Telegram Chat ID is: \`${chatId}\`\n\nPlease enter this ID on your dashboard to link your account.`);
      return NextResponse.json({ ok: true });
    }

    // --- 2. FETCH USER BY 'tci' ---
    // We look up the user in the new 'users' table using the 'tci' column
    const { data: user } = await supabase
      .from('users')
      .select('id, full_name, phone_number')
      .eq('tci', chatId)
      .single();

    // --- 3. /PROFILE & PHONE CAPTURE ---
    if (text === '/profile' || message.contact) {
      if (!user) {
        await sendBotMsg("⚠️ Please log in to the docwallet dashboard and link your Telegram account first.");
      } else if (message.contact) {
        await supabase.from('users').update({ phone_number: message.contact.phone_number }).eq('tci', chatId);
        await sendBotMsg("✅ Phone number securely saved to your profile!");
      } else if (!user.phone_number) {
        await sendBotMsg("📱 Your profile is missing a phone number. Tap below to share it securely.", {
          keyboard: [[{ text: "📱 Share My Number", request_contact: true }]],
          resize_keyboard: true, one_time_keyboard: true
        });
      } else {
        await sendBotMsg(`👤 *Profile Summary*\nName: ${user.full_name || 'Doctor'}\nPhone: ${user.phone_number}\nStatus: Verified ✅`);
      }
      return NextResponse.json({ ok: true });
    }

    // --- 4. /SUMMARY COMMAND ---
    if (text === '/summary') {
      await sendBotMsg("📊 *Quick Reports:*", {
        inline_keyboard: [
          [{ text: "📅 Last 7 Days Summary", callback_data: "report_week" }],
          [{ text: "⛽ Fuel Expenses", callback_data: "report_fuel" }]
        ]
      });
      return NextResponse.json({ ok: true });
    }

    // --- 5. /UNDO COMMAND ---
    if (text === '/undo' && user) {
      const { data: lastTx } = await supabase
        .from('transactions')
        .select('id, amount, category')
        .eq('user_id', user.id)
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

    // Block transactions if not linked
    if (!user && text) {
      await sendBotMsg('❌ *Account Not Linked*\n\nPlease log in to the docwallet dashboard and save your Chat ID.');
      return NextResponse.json({ ok: true });
    }

    // Skip if it's not a text message (e.g., photo)
    if (!text) return NextResponse.json({ ok: true });

    // --- 6. AI EXTRACTION (Now Date-Aware) ---
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `
      Extract financial transaction details from: "${text}"
      Current Date context: ${new Date().toLocaleDateString('en-IN')}

      Return ONLY a JSON object with these fields:
      - amount (number)
      - type (strictly "Income" or "Expense")
      - category (string)
      - entity_source (string)
      - date (YYYY-MM-DD format. Use the date mentioned like "yesterday", or today's date if none mentioned).

      Example: {"amount": 500, "type": "Expense", "category": "Supplies", "entity_source": "Pharmacy", "date": "2026-04-06"}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let jsonText = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    
    let parsedData;
    try {
      parsedData = JSON.parse(jsonText);
    } catch (e) {
      await sendBotMsg('I could not understand those financial details. Please try formatting it like: "Yesterday spent ₹500 on clinic supplies"');
      return NextResponse.json({ ok: true });
    }

    // --- 7. DATABASE INSERT ---
    const { error: txError } = await supabase.from('transactions').insert([{
      user_id: user.id, // Using the ID from the users table!
      type: parsedData.type,
      amount: parsedData.amount,
      category: parsedData.category,
      entity_source: parsedData.entity_source,
      raw_text: text
    }]);

    if (txError) {
      console.error('Supabase error:', txError);
      await sendBotMsg("Sorry, I couldn't save that transaction. Please check your dashboard.");
    } else {
      // Success message now includes the date AI found!
      await sendBotMsg(`✅ *Transaction Saved!*\n\n*Date:* ${parsedData.date}\n*Type:* ${parsedData.type}\n*Amount:* ₹${parsedData.amount}\n*Category:* ${parsedData.category}`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error handling telegram webhook:', error);
    return NextResponse.json({ ok: true }); 
  }
}
