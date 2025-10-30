import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// 1. Import all the tools we need from Wagmi
import { WagmiConfig, createConfig, configureChains } from 'wagmi'; // Corrected Line
import { sepolia } from 'wagmi/chains';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 2. Set up the chains and providers
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [sepolia], 
  [alchemyProvider({ apiKey: 'Jxc744dNPCknhjcKh5LZw' })]
);

// 3. Create the Wagmi config
const config = createConfig({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({ chains }), // We're telling Wagmi to support MetaMask
  ],
  publicClient,
  webSocketPublicClient,
});

// 4. Create a client for React Query
const queryClient = new QueryClient();

// 5. Render the app, wrapped in all the providers
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiConfig>
  </React.StrictMode>
);