import React from 'react';
import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react';
import { setupAutomaticEthereumWalletDerivation } from '@aptos-labs/derived-wallet-ethereum';
import { Network } from '@aptos-labs/ts-sdk';
import { WalletProvider } from './WalletContext';

// Setup Ethereum wallet derivation (MetaMask support) on Shelbynet
setupAutomaticEthereumWalletDerivation({ 
  defaultNetwork: Network.SHELBYNET,
});

export function AppProviders({ children }) {
  return (
    <AptosWalletAdapterProvider
      dappConfig={{
        network: Network.SHELBYNET,
        crossChainWallets: true, // Enable MetaMask/Ethereum wallets
      }}
      autoConnect={true} // adapter-managed auto-connect
    >
      <WalletProvider>
        {children}
      </WalletProvider>
    </AptosWalletAdapterProvider>
  );
}
