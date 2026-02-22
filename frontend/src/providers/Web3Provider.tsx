"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme, type Theme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { config } from "@/config/wagmi";
import { ToastProvider } from "@/components/Toast";
import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

const customTheme: Theme = {
  ...darkTheme({
    accentColor: "#27AE60",
    accentColorForeground: "white",
    borderRadius: "large",
    overlayBlur: "small",
  }),
  colors: {
    ...darkTheme().colors,
    accentColor: "#27AE60",
    accentColorForeground: "white",
    modalBackground: "#212429",
    modalBorder: "rgba(255,255,255,0.06)",
    profileForeground: "#212429",
    connectButtonBackground: "#212429",
    connectButtonInnerBackground: "#2C2F36",
  },
  shadows: {
    ...darkTheme().shadows,
    connectButton: "0 0 24px rgba(39, 174, 96, 0.08)",
  },
};

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={customTheme}>
          <ToastProvider>{children}</ToastProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
