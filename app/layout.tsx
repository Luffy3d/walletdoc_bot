import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'docwallet | AI Telegram Expense Tracker',
  description: 'Track your expenses as easily as texting a friend. AI-powered personal finance dashboard with zero friction.',
  keywords: 'Telegram expense tracker, AI budget bot, docwallet, personal finance India',
  
  // --- GOOGLE VERIFICATION ---
  verification: {
    google: '03f40a8c91d058dd',
  },

  // --- SOCIAL MEDIA PREVIEW ---
  openGraph: {
    title: 'docwallet | Text Your Expenses. We Do The Rest.',
    description: 'The zero-friction expense tracker that lives inside Telegram.',
    url: 'https://docwallet.vercel.app',
    siteName: 'docwallet',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
