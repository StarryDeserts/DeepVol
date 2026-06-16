import type { DeepBookPredictNetworkConfig } from "@deepvol/types/deepbookPredict";

export {
  RANGEPILOT_ADMIN_CAP_ID,
  RANGEPILOT_PROTOCOL_VAULT_ID,
  RANGEPILOT_STRATEGY_TESTNET,
  RANGEPILOT_TESTNET,
  RANGEPILOT_WRAPPER_PACKAGE_ID,
} from "./rangePilotTestnet.ts";

export const DEEPBOOK_PREDICT_TESTNET = {
  network: "testnet",
  publicServer: "https://predict-server.testnet.mystenlabs.com",
  packageId:
    "0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138",
  registryId:
    "0x43af14fed5480c20ff77e2263d5f794c35b9fab7e2212903127062f4fe2a6e64",
  predictId:
    "0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a",
  quoteAssets: {
    DUSDC: {
      coinType:
        "0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC",
      currencyId:
        "0xf3000dff421833d4bb8ed58fac146d691a3aaba2785aa1989af65a7089ca3e9c",
      decimals: 6,
    },
  },
  plpCoinType:
    "0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138::plp::PLP",
  sourceBranch: "predict-testnet-4-16",
} as const satisfies DeepBookPredictNetworkConfig;
