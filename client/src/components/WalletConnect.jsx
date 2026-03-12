import React, { useState } from 'react';
import { Wallet, Wallet2, Copy, ExternalLink, Loader2, Droplets, ArrowRight } from 'lucide-react';
import { useWalletContext } from '../contexts/WalletContext';
import { cn } from '../lib/utils';

export function WalletConnect() {
  const { 
    connected, 
    account, 
    connect, 
    disconnect, 
    balance, 
    shelbyBalance, 
    isLoading, 
    requestFaucet, 
    formatBalance,
    getWalletType,
    isCrossChain
  } = useWalletContext();
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Connect error:', error);
    }
  };

  const copyAddress = () => {
    if (account?.address) {
      navigator.clipboard.writeText(account.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFaucet = async () => {
    try {
      await requestFaucet();
      alert('Faucet requested successfully! Check your balance in a few seconds.');
    } catch (error) {
      alert('Faucet request failed. Please try again.');
    }
  };

  if (!connected) {
    return (
      <button
        onClick={handleConnect}
        className="flex items-center gap-2 px-4 py-2 bg-shelby-600 text-white rounded-lg hover:bg-shelby-700 transition-colors font-medium"
      >
        <Wallet size={18} />
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={cn(
          "flex items-center gap-3 px-4 py-2 bg-white border rounded-lg hover:bg-slate-50 transition-colors",
          isCrossChain 
            ? "border-purple-200 bg-purple-50 hover:bg-purple-100" 
            : "border-slate-200"
        )}
      >
        <div className={cn(
          "w-2 h-2 rounded-full",
          isCrossChain ? "bg-purple-500" : "bg-green-500"
        )}></div>
        <span className="font-medium text-slate-700">
          {account?.address?.slice(0, 6)}...{account?.address?.slice(-4)}
        </span>
        {isCrossChain && (
          <span className="px-2 py-0.5 bg-purple-100 text-purple-600 text-xs rounded-full font-medium">
            MetaMask
          </span>
        )}
        <Wallet2 size={16} className="text-slate-400" />
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-600">Wallet Address</span>
              <button
                onClick={copyAddress}
                className="p-1 rounded hover:bg-slate-100 transition-colors"
              >
                {copied ? (
                  <div className="w-4 h-4 bg-green-500 rounded flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                ) : (
                  <Copy size={14} className="text-slate-400" />
                )}
              </button>
            </div>
            <div className="font-mono text-sm text-slate-700 bg-slate-50 p-2 rounded">
              {account?.address}
            </div>
            {isCrossChain && (
              <div className="mt-2 flex items-center gap-2 text-xs text-purple-600 bg-purple-50 p-2 rounded">
                <ArrowRight size={12} />
                <span>Derived Aptos account from {getWalletType()}</span>
              </div>
            )}
          </div>

          <div className="p-4 border-b border-slate-100">
            <h4 className="text-sm font-medium text-slate-600 mb-3">Balances</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">A</span>
                  </div>
                  <span className="text-sm text-slate-600">APT</span>
                </div>
                <span className="font-mono text-sm text-slate-700">
                  {formatBalance(balance)} APT
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">$</span>
                  </div>
                  <span className="text-sm text-slate-600">ShelbyUSD</span>
                </div>
                <span className="font-mono text-sm text-slate-700">
                  {shelbyBalance ? formatBalance(shelbyBalance) : '0'} SUSD
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-slate-100">
            <button
              onClick={handleFaucet}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Droplets size={16} />
              )}
              Get Test Tokens
            </button>
          </div>

          <div className="p-4">
            <div className="flex gap-2">
              <a
                href={`https://explorer.shelby.xyz/shelbynet/account/${account?.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm"
              >
                <ExternalLink size={14} />
                Explorer
              </a>
              
              <button
                onClick={() => disconnect()}
                className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
