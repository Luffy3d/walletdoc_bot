import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase (Server-side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    console.log('Telegram payload:', JSON.stringify(payload, null, 2));

    if (!payload.message) {
      return NextResponse.json({ ok: true });
    }

    const chatId = payload.message.chat.id;
    const text = payload.message.text;

    if (!text) {
      return NextResponse.json({ ok: true });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const sendTelegramMessage = async (msg: string) => {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown' }),
      });
    };

    if (text === '/start') {
      await sendTelegramMessage(`Welcome to *docwallet*! 🩺\n\nYour Telegram Chat ID is: \`${chatId}\`\n\nPlease enter this ID on your dashboard to link your account.\n\nOnce linked, you can send me your expenses or income (e.g., "Spent 500 on medical supplies") and I will track it for you.`);
      return NextResponse.json({ ok: true });
    }

    // Use Gemini to parse the text
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
      Extract financial transaction details from the following text: "${text}"
      Return ONLY a JSON object with these fields:
      - amount (number)
      - type (string, either "Income" or "Expense")
      - category (string)
      - entity_source (string)

      If the text is ambiguous, make your best guess.
      Example output: {"amount": 500, "type": "Expense", "category": "Supplies", "entity_source": "Pharmacy"}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let jsonText = response.text();
    
    // Clean up markdown if Gemini returns it
    jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsedData = JSON.parse(jsonText || '{}');
    console.log('Parsed data:', parsedData);

    // Find user based on telegram_chat_id
    let { data: device } = await supabase
      .from('telegram_devices')
      .select('user_id, users(email)')
      .eq('telegram_chat_id', chatId)
      .single();

    let userId = device?.user_id;

    if (!userId) {
      await sendTelegramMessage('❌ *Account Not Linked*\n\nPlease log in to the docwallet dashboard and link your Telegram account to start tracking transactions.');
      return NextResponse.json({ ok: true });
    }

    // Insert transaction
    const { error: txError } = await supabase.from('transactions').insert([{
      user_id: userId,
      type: parsedData.type,
      amount: parsedData.amount,
      category: parsedData.category,
      entity_source: parsedData.entity_source,
      raw_text: text
    }]);

    if (txError) {
      console.error('Supabase error:', txError);
      await sendTelegramMessage('Sorry, I couldn\'t save that transaction. Please try again.');
    } else {
      await sendTelegramMessage(`✅ *Transaction Saved!*\n\n*Type:* ${parsedData.type}\n*Amount:* ₹${parsedData.amount}\n*Category:* ${parsedData.category}\n*Source:* ${parsedData.entity_source}`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error handling telegram webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
