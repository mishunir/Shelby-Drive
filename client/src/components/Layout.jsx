import React from 'react';
import { UploadCloud, File, CheckCircle, AlertCircle, X } from 'lucide-react';
import { WalletConnect } from './WalletConnect';

export function Header() {
  return (
    <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-shelby-600 rounded-lg flex items-center justify-center text-white">
            <UploadCloud size={20} />
          </div>
          <span className="font-bold text-xl text-slate-800">Shelby Upload</span>
        </div>
        <WalletConnect />
      </div>
    </header>
  );
}

export function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        {children}
      </main>
      <footer className="text-center py-8 text-slate-400 text-sm">
        Powered by ShStorage — <a href="https://x.com/trungkts29" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300">@trungkts29</a>
      </footer>
    </div>
  );
}
