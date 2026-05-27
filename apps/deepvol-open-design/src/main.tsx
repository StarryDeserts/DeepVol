import React from "react";
import { createRoot } from "react-dom/client";
import {
  createNetworkConfig,
  SuiClientProvider,
  WalletProvider,
} from "@mysten/dapp-kit";
import "@mysten/dapp-kit/dist/index.css";
import { getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import "./styles/main.css";

const { networkConfig } = createNetworkConfig({
  testnet: {
    network: "testnet",
    url: getJsonRpcFullnodeUrl("testnet"),
  },
});

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider autoConnect>
          <App />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
