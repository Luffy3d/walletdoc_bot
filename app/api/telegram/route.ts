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

    // Replace this with your actual domain later if you buy one!
    const DASHBOARD_URL = "https://walletdoc-bot.vercel.app/login";

    const payload: any = await req.json();

    if (!payload.message) {
      return NextResponse.json({ ok: true });
    }

    const chatId = payload.message.chat.id.toString();
    const text = payload.message.text || '';
    const lowerText = text.toLowerCase();
    const contact = payload.message.contact;

    if (!text && !contact) {
      return NextResponse.json({ ok: true }); 
    }

    const sendBotMsg = async (msg: string, replyMarkup?: any) => {
      const body: any = { chat_id: chatId, text: msg, parse_mode: 'Markdown' };
      if (replyMarkup) {
        body.reply_markup = replyMarkup;
      }
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    };

    let { data: device } = await supabase
      .from('telegram_devices')
      .select('user_id')
      .eq('telegram_chat_id', chatId)
      .single();

    let userId = device?.user_id;

    if (contact && userId) {
      const newName = [contact.first_name, contact.last_name].filter(Boolean).join(' ');
      const newMobile = contact.phone_number;
      
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { full_name: newName, mobile_number: newMobile }
      });
      
      await sendBotMsg(`✅ Profile updated perfectly, *${newName}*!\n\nYou can now start logging transactions. Try saying "Spent ₹500 on fuel".`, { remove_keyboard: true });
      return NextResponse.json({ ok: true });
    }

    // --- UPGRADED /START COMMAND ---
    if (lowerText === '/start') {
      if (!userId) {
        // Includes the sleek Inline URL Button
        await sendBotMsg(`Welcome to *docwallet*! 🩺\n\nYour Telegram Chat ID is: \`${chatId}\`\n\nClick the button below to open your dashboard, create an account, and paste this ID to link your Telegram!`, {
          inline_keyboard: [[
            { text: "🌐 Open docwallet Dashboard", url: DASHBOARD_URL }
          ]]
        });
      } else {
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        const fullName = userData?.user?.user_metadata?.full_name;
        
        if (fullName) {
          await sendBotMsg(`Welcome back, *${fullName}*! 👋\n\nI'm ready to log your transactions. Just text me what you spent or earned.\n\n*Available Commands:*\n📊 /summary - Current month totals\n🕒 /recent - Last 5 transactions\n↩️ /undo - Delete the last entry`);
        } else {
          await sendBotMsg(`Welcome back! 👋\n\nI noticed your profile is incomplete. Please tap the button below to securely share your name and number so I can update your account.`, {
            keyboard: [[{ text: "📱 Share My Contact Info", request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true
          });
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (!userId) {
      await sendBotMsg('❌ *Account Not Linked*\n\nPlease log in to the docwallet dashboard and link your Telegram account to start tracking transactions.', {
        inline_keyboard: [[
          { text: "🌐 Open Dashboard", url: DASHBOARD_URL }
        ]]
      });
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

    if (lowerText === '/summary') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: monthTx } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', userId)
        .gte('created_at', startOfMonth);

      let income = 0;
      let expense = 0;

      if (monthTx) {
        monthTx.forEach(tx => {
          if (tx.type === 'Income') income += Number(tx.amount);
          if (tx.type === 'Expense') expense += Number(tx.amount);
        });
      }

      const balance = income - expense;
      await sendBotMsg(`📊 *This Month's Summary*\n\n📈 *Income:* ₹${income.toLocaleString('en-IN')}\n📉 *Expenses:* ₹${expense.toLocaleString('en-IN')}\n💰 *Net Balance:* ₹${balance.toLocaleString('en-IN')}`);
      return NextResponse.json({ ok: true });
    }

    if (lowerText === '/recent') {
      const { data: recentTx } = await supabase
        .from('transactions')
        .select('type, amount, category')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!recentTx || recentTx.length === 0) {
        await sendBotMsg("No recent transactions found.");
        return NextResponse.json({ ok: true });
      }

      let msg = `🗓️ *Last 5 Transactions*\n\n`;
      recentTx.forEach(tx => {
        const icon = tx.type === 'Income' ? '🟢' : '🔴';
        msg += `${icon} ₹${tx.amount.toLocaleString('en-IN')} - ${tx.category}\n`;
      });
      
      await sendBotMsg(msg);
      return NextResponse.json({ ok: true });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    // AI PROMPT UPGRADED: Explicit instruction for random non-financial text
    const prompt = `
      Extract ALL financial transaction details from the following text: "${text}"
      
      If the text does NOT contain any financial transactions, return an empty array [].
      Otherwise, return a JSON ARRAY of objects. Even if there is only one transaction, put it inside an array [].
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

    let jsonText = "";
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      jsonText = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    } catch (aiError: any) {
      console.error("AI Generation Error:", aiError);
      if (aiError?.status === 503 || aiError?.message?.includes("503")) {
        await sendBotMsg("⏳ *Google AI is currently experiencing high traffic.* \n\nPlease wait a few seconds and try sending your transaction again!");
      } else {
        await sendBotMsg("⚠️ *Oops!* I had trouble connecting to the AI brain. Please try again.");
      }
      return NextResponse.json({ ok: true });
    }
    
    let parsedData: any[];
    try {
      parsedData = JSON.parse(jsonText);
      if (!Array.isArray(parsedData)) {
        parsedData = [parsedData];
      }
    } catch (e) {
      await sendBotMsg("I didn't detect any transaction details in your message. 🤷‍♂️\n\nPlease format it like: *'Spent ₹500 on food'* or *'Received ₹1000 from client'*.");
      return NextResponse.json({ ok: true });
    }

    // --- NEW: CATCH EMPTY RESULTS (RANDOM MESSAGES) ---
    if (parsedData.length === 0) {
      await sendBotMsg("I didn't detect any financial transactions in that message. 🤷‍♂️\n\nJust tell me what you spent or earned! (e.g., *'Paid ₹250 for coffee'* or *'Received ₹5000 consultation fee'*).");
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
        successMessage += `*${tx.type}:* ₹${tx.amount.toLocaleString('en-IN')} (${tx.category})\n`;
      });
      await sendBotMsg(successMessage);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error handling telegram webhook:', error);
    return NextResponse.json({ ok: true }); 
  }
}
