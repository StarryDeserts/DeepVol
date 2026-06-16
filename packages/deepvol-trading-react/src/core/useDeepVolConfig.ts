import { DEEPVOL_TESTNET } from "@deepvol/config/deepVolTestnet";
import { DEEPBOOK_PREDICT_TESTNET } from "@deepvol/config/deepbookPredictTestnet";
import {
  CONFIGURED_BTC_MOVE_SERIES_ID,
  CONTROLLED_REDEEM_BUY_DIGEST,
  CONTROLLED_REDEEM_RECEIPT_ID,
} from "./constants";

export function useDeepVolConfig() {
  const dusdc = DEEPBOOK_PREDICT_TESTNET.quoteAssets.DUSDC;

  return {
    network: DEEPVOL_TESTNET.network,
    packageId: DEEPVOL_TESTNET.packageId,
    protocolVaultId: DEEPVOL_TESTNET.protocolVaultId,
    adminCapId: DEEPVOL_TESTNET.adminCapId,
    upgradeCapId: DEEPVOL_TESTNET.upgradeCapId,
    publisher: DEEPVOL_TESTNET.publisher,
    defaultCreateFeeBps: DEEPVOL_TESTNET.defaultCreateFeeBps,
    maxCreateFeeBps: DEEPVOL_TESTNET.maxCreateFeeBps,
    primaryMarket: DEEPVOL_TESTNET.primaryMarket,
    receiptCustody: DEEPVOL_TESTNET.receiptCustody,
    predictId: DEEPBOOK_PREDICT_TESTNET.predictId,
    publicServer: DEEPBOOK_PREDICT_TESTNET.publicServer,
    dusdcCoinType: dusdc.coinType,
    dusdcCurrencyId: dusdc.currencyId,
    dusdcDecimals: dusdc.decimals,
    configuredSeriesId: CONFIGURED_BTC_MOVE_SERIES_ID,
    validatedReferenceReceiptId: CONTROLLED_REDEEM_RECEIPT_ID,
    validatedReferenceBuyDigest: CONTROLLED_REDEEM_BUY_DIGEST,
    isPackageConfigured: Boolean(DEEPVOL_TESTNET.packageId),
    isProtocolVaultConfigured: Boolean(DEEPVOL_TESTNET.protocolVaultId),
    isDusdcConfigured: Boolean(dusdc.coinType),
    isMvpSeriesConfigured: Boolean(CONFIGURED_BTC_MOVE_SERIES_ID),
  };
}
