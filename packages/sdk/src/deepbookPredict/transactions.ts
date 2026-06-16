import { Transaction } from "@mysten/sui/transactions";
import type {
  DeepBookPredictAmountLike,
  DeepBookPredictNetwork,
  DeepBookPredictNetworkConfig,
  DepositDusdcParams,
} from "@deepvol/types/deepbookPredict";
import { resolveDeepBookPredictConfig } from "./config.ts";
import { selectDusdcCoinsForAmount } from "./coins.ts";
import { DeepBookPredictUnconfirmedBindingError } from "./errors.ts";

export type BuildCreateManagerTransactionOptions = {
  config?: DeepBookPredictNetworkConfig;
};

export type BuildDepositDusdcTransactionOptions = DepositDusdcParams & {
  config?: DeepBookPredictNetworkConfig;
  allowRealTestnetDeposit?: boolean;
};

export function buildCreateManagerTransaction(
  options: BuildCreateManagerTransactionOptions = {},
): Transaction {
  const config = resolveDeepBookPredictConfig(options.config);
  const tx = new Transaction();

  tx.moveCall({
    target: `${config.packageId}::predict::create_manager`,
  });

  return tx;
}

export function buildDepositDusdcTransaction(
  params: BuildDepositDusdcTransactionOptions,
): Transaction {
  const config = resolveDeepBookPredictConfig(params.config);
  const amountAtomic = normalizeAmountAtomic(params.amountAtomic);
  const selectedCoins = selectDusdcCoinsForAmount(params.coins, amountAtomic);

  if (!params.allowRealTestnetDeposit) {
    throw new DeepBookPredictUnconfirmedBindingError(
      `MUST CONFIRM BEFORE REAL DEPOSIT: ${config.packageId}::predict_manager::deposit<${config.quoteAssets.DUSDC.coinType}> PTB coin merge/split and Coin<DUSDC> argument construction are not validated yet.`,
    );
  }

  if (config.network !== "testnet") {
    throw new DeepBookPredictUnconfirmedBindingError(
      "Real DUSDC deposit transaction building is only allowed for Sui Testnet validation.",
    );
  }

  const tx = new Transaction();
  const destinationCoin = tx.objectRef({
    objectId: selectedCoins[0].coinObjectId,
    version: selectedCoins[0].version,
    digest: selectedCoins[0].digest,
  });
  const sourceCoins = selectedCoins.slice(1).map((coin) =>
    tx.objectRef({
      objectId: coin.coinObjectId,
      version: coin.version,
      digest: coin.digest,
    }),
  );

  if (sourceCoins.length > 0) {
    tx.mergeCoins(destinationCoin, sourceCoins);
  }

  const selectedTotal = selectedCoins.reduce(
    (total, coin) => total + BigInt(coin.balanceAtomic),
    0n,
  );
  const requestedAmount = BigInt(amountAtomic);
  const depositCoin =
    selectedTotal > requestedAmount
      ? tx.splitCoins(destinationCoin, [tx.pure.u64(amountAtomic)])[0]
      : destinationCoin;

  tx.moveCall({
    target: `${config.packageId}::predict_manager::deposit`,
    typeArguments: [config.quoteAssets.DUSDC.coinType],
    arguments: [tx.object(params.managerId), depositCoin],
  });

  return tx;
}

export function buildSuiExplorerTransactionUrl(
  digest: string,
  network: DeepBookPredictNetwork = "testnet",
): string {
  return `https://suiexplorer.com/txblock/${encodeURIComponent(digest)}?network=${encodeURIComponent(network)}`;
}

export function normalizeAmountAtomic(amount: DeepBookPredictAmountLike): string {
  const normalized = BigInt(amount);

  if (normalized <= 0n) {
    throw new DeepBookPredictUnconfirmedBindingError(
      "Deposit amount must be greater than 0 atomic units.",
    );
  }

  return normalized.toString();
}
