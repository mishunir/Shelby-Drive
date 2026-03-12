import React, { createContext, useContext, useState, useEffect } from 'react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

// Aptos configuration for Shelbynet
const aptosConfig = new AptosConfig({ 
  network: Network.SHELBYNET,
});

const aptos = new Aptos(aptosConfig);

const WalletContext = createContext();

export function WalletProvider({ children }) {
  const { 
    account, 
    connected, 
    wallets,
    select,
    connect, 
    disconnect, 
    signAndSubmitTransaction,
    wallet 
  } = useWallet();
  
  const [balance, setBalance] = useState(null);
  const [shelbyBalance, setShelbyBalance] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCrossChain, setIsCrossChain] = useState(false);

  // Auto-switch to Shelbynet if not already
  useEffect(() => {
    if (wallets?.length > 0 && !connected) {
      const petra = wallets.find(w => w.name === 'Petra');
      if (petra && petra.networks?.length > 0) {
        const shelbynet = petra.networks.find(n => 
          n.name?.toLowerCase().includes('shelby') || 
          n.chainId?.toString() === '5' // Shelbynet chainId
        );
        if (shelbynet && petra.networks[0].name !== shelbynet.name) {
          console.log('[Wallet] Auto-switching to Shelbynet');
          // Note: Wallet adapter doesn't expose network switching API directly
          // This would require user to manually switch in Petra wallet
        }
      }
    }
  }, [wallets, connected]);

  // Check if it's a cross-chain wallet (MetaMask, etc.)
  useEffect(() => {
    if (wallet?.name) {
      const crossChainWallets = ['MetaMask', 'Coinbase Wallet', 'WalletConnect'];
      setIsCrossChain(crossChainWallets.includes(wallet.name));
    }
  }, [wallet]);

  // Fetch balances when account changes
  useEffect(() => {
    if (account?.address && connected) {
      fetchBalances();
    } else {
      setBalance(null);
      setShelbyBalance(null);
    }
  }, [account, connected]);

  const fetchBalances = async () => {
    if (!account?.address) return;
    
    try {
      setIsLoading(true);
      
      // Fetch APT balance
      const aptBalance = await aptos.getAccountAPTAmount({
        accountAddress: account.address
      });
      setBalance(aptBalance);

      // Fetch ShelbyUSD balance (mock for now - replace with actual token address)
      setShelbyBalance(null);
      
    } catch (error) {
      console.error('Failed to fetch balances:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestFaucet = async () => {
    if (!account?.address) return;
    
    try {
      setIsLoading(true);
      
      // Request APT from faucet
      const response = await aptos.fundAccount({
        accountAddress: account.address,
        amount: 100000000 // 0.1 APT
      });
      
      console.log('Faucet response:', response);
      
      // Refresh balance after faucet
      setTimeout(fetchBalances, 2000);
      
      return response;
    } catch (error) {
      console.error('Faucet failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const formatBalance = (balance) => {
    if (!balance) return '0';
    return (parseFloat(balance) / 100000000).toFixed(4);
  };

  const getWalletType = () => {
    if (!wallet) return 'Unknown';
    if (isCrossChain) return 'Cross-Chain';
    return 'Aptos';
  };

  const value = {
    account,
    connected,
    wallets,
    select,
    connect,
    disconnect,
    signAndSubmitTransaction,
    wallet,
    balance,
    shelbyBalance,
    isLoading,
    isCrossChain,
    fetchBalances,
    requestFaucet,
    formatBalance,
    getWalletType,
    aptos
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within WalletProvider');
  }
  return context;
}
