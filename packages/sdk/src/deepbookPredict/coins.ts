import type { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import type {
  DeepBookPredictAmountLike,
  DeepBookPredictNetworkConfig,
  DusdcBalance,
  DusdcCoin,
} from "@deepvol/types/deepbookPredict";
import { resolveDeepBookPredictConfig } from "./config.ts";
import { DeepBookPredictCoinSelectionError } from "./errors.ts";

const DUSDC_COIN_PAGE_LIMIT = 50;

export async function getDusdcCoins(
  client: Pick<SuiJsonRpcClient, "getCoins">,
  owner: string,
  config?: DeepBookPredictNetworkConfig,
): Promise<DusdcCoin[]> {
  const resolvedConfig = resolveDeepBookPredictConfig(config);
  const coinType = resolvedConfig.quoteAssets.DUSDC.coinType;
  const coins: DusdcCoin[] = [];
  let cursor: string | null | undefined;

  do {
    const page = await client.getCoins({
      owner,
      coinType,
      cursor,
      limit: DUSDC_COIN_PAGE_LIMIT,
    });

    coins.push(
      ...page.data.map((coin) => ({
        coinObjectId: coin.coinObjectId,
        version: coin.version,
        digest: coin.digest,
        balanceAtomic: coin.balance,
        coinType: coin.coinType,
        previousTransaction: coin.previousTransaction,
      })),
    );

    cursor = page.hasNextPage ? page.nextCursor : null;
  } while (cursor);

  return coins;
}

export async function getDusdcBalance(
  client: Pick<SuiJsonRpcClient, "getCoins">,
  owner: string,
  config?: DeepBookPredictNetworkConfig,
): Promise<DusdcBalance> {
  const resolvedConfig = resolveDeepBookPredictConfig(config);
  const coins = await getDusdcCoins(client, owner, resolvedConfig);
  const totalAtomic = coins.reduce(
    (total, coin) => total + BigInt(coin.balanceAtomic),
    0n,
  );

  return {
    coinType: resolvedConfig.quoteAssets.DUSDC.coinType,
    decimals: resolvedConfig.quoteAssets.DUSDC.decimals,
    totalAtomic: totalAtomic.toString(),
    coins,
  };
}

export function selectDusdcCoinsForAmount(
  coins: readonly DusdcCoin[],
  amountAtomic: DeepBookPredictAmountLike,
): DusdcCoin[] {
  const requiredAmount = toPositiveBigInt(amountAtomic, "Deposit amount");
  const selected: DusdcCoin[] = [];
  let selectedTotal = 0n;

  for (const coin of [...coins].sort((left, right) => {
    const leftBalance = BigInt(left.balanceAtomic);
    const rightBalance = BigInt(right.balanceAtomic);
    return leftBalance < rightBalance ? -1 : leftBalance > rightBalance ? 1 : 0;
  })) {
    if (selectedTotal >= requiredAmount) {
      break;
    }

    const balance = BigInt(coin.balanceAtomic);
    if (balance <= 0n) {
      continue;
    }

    selected.push(coin);
    selectedTotal += balance;
  }

  if (selectedTotal < requiredAmount) {
    throw new DeepBookPredictCoinSelectionError(
      `Insufficient DUSDC balance: need ${requiredAmount.toString()} atomic units but selected ${selectedTotal.toString()}.`,
    );
  }

  return selected;
}

function toPositiveBigInt(value: DeepBookPredictAmountLike, label: string): bigint {
  const amount = BigInt(value);

  if (amount <= 0n) {
    throw new DeepBookPredictCoinSelectionError(
      `${label} must be greater than 0 atomic units.`,
    );
  }

  return amount;
}
