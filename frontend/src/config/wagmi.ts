import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { creditcoinTestnet } from "./chain";

export const config = getDefaultConfig({
  appName: "CreditVault",
  projectId: "d5a3d688d37c0485a6e8a4bba3f74aad", // public demo WalletConnect ID
  chains: [creditcoinTestnet],
  transports: {
    [creditcoinTestnet.id]: http("https://rpc.cc3-testnet.creditcoin.network"),
  },
  ssr: true,
});
