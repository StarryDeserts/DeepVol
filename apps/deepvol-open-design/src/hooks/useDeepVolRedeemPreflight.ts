import { useCallback, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { DEEPBOOK_PREDICT_TESTNET } from "@rangepilot/config/deepbookPredictTestnet";
import {
  buildRedeemBinaryPositionsTransaction,
  buildSuiExplorerTransactionUrl,
  devInspectBinaryQuote,
  devInspectManagerBalance,
  devInspectRedeemBinaryPosition,
  devInspectRedeemBinaryPositions,
  parsePositionRedeemedEvents,
  readBinaryPositionQuantity,
  translateDeepBookPredictError,
} from "@rangepilot/sdk/deepbookPredict";
import { readMoveReceipt } from "@rangepilot/sdk/deepVol";
import type { PositionRedeemedEvent, TransactionStatus } from "@rangepilot/types/deepbookPredict";
import type { MoveReceipt } from "@rangepilot/types/deepVol";
import { useSuiWallet } from "./useSuiWallet";
import { redeemExecutionBlockers } from "./redeemMoveReceiptGate";
import {
  CONTROLLED_REDEEM_DOWN_STRIKE,
  CONTROLLED_REDEEM_EXPIRY,
  CONTROLLED_REDEEM_ORACLE_ID,
  CONTROLLED_REDEEM_OWNER,
  CONTROLLED_REDEEM_PREDICT_MANAGER_ID,
  CONTROLLED_REDEEM_QUANTITY,
  CONTROLLED_REDEEM_RECEIPT_ID,
  CONTROLLED_REDEEM_UP_STRIKE,
  DEEPVOL_STORAGE_KEYS,
  TESTNET_CHAIN,
} from "../lib/constants";
import {
  persistControlledRedeemAttempt,
  persistReceiptRedeemValidation,
  readControlledRedeemAttempt,
  type StoredDeepVolReceipt,
  type StoredDeepVolRedeemLegValidation,
  type StoredDeepVolRedeemValidation,
} from "../lib/deepVolReceiptStorage";

export type RedeemLegUiState = {
  direction: "up" | "down";
  strike: string | null;
  receiptQuantityAtomic: string | null;
  managerPositionQuantityAtomic: string | null;
  preflightQuantityAtomic: string | null;
  redeemPayoutAtomic: string | null;
  preflightPassed: boolean;
  blocker: string | null;
};

export type RedeemPreflightUiState = {
  up: RedeemLegUiState;
  down: RedeemLegUiState;
  isChecking: boolean;
  message: string;
  dependencyKey: string | null;
  executionEnabled: boolean;
};

export type RedeemReconciliationSummary = {
  status: "reconciled" | "reconciliation_warning";
  warnings: string[];
  digest: string;
  explorerUrl: string;
  managerBalanceBeforeAtomic: string | null;
  managerBalanceAfterAtomic: string | null;
  totalPayoutAtomic: string | null;
  up: StoredDeepVolRedeemLegValidation;
  down: StoredDeepVolRedeemLegValidation;
  events: PositionRedeemedEvent[];
};

const initialLeg = (direction: "up" | "down"): RedeemLegUiState => ({
  direction,
  strike: null,
  receiptQuantityAtomic: null,
  managerPositionQuantityAtomic: null,
  preflightQuantityAtomic: null,
  redeemPayoutAtomic: null,
  preflightPassed: false,
  blocker: null,
});

export function useDeepVolRedeemPreflight(receipt: MoveReceipt | null, storedRecord: StoredDeepVolReceipt | null = null) {
  const client = useSuiClient();
  const queryClient = useQueryClient();
  const wallet = useSuiWallet();
  const requestId = useRef(0);
  const executionInFlight = useRef(false);
  const [state, setState] = useState<RedeemPreflightUiState>({
    up: initialLeg("up"),
    down: initialLeg("down"),
    isChecking: false,
    message: "Run redeem preflight to inspect the underlying UP and DOWN positions.",
    dependencyKey: null,
    executionEnabled: false,
  });
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>({ state: "idle" });
  const [reconciliation, setReconciliation] = useState<RedeemReconciliationSummary | null>(null);
  const dependencyKey = useMemo(() => buildRedeemDependencyKey(receipt, wallet.address, wallet.isTestnet), [receipt, wallet.address, wallet.isTestnet]);
  const existingAttempt = receipt ? readControlledRedeemAttempt(DEEPVOL_STORAGE_KEYS, receipt.receiptId) : null;
  const signAndExecuteTransaction = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      client.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showEvents: true,
          showEffects: true,
          showObjectChanges: true,
          showRawEffects: true,
        },
      }),
  });

  const runPreflight = useCallback(async () => {
    const currentRequestId = requestId.current + 1;
    requestId.current = currentRequestId;

    if (!receipt) {
      setState({
        up: initialLeg("up"),
        down: initialLeg("down"),
        isChecking: false,
        message: "Receipt readback is required before redeem preflight.",
        dependencyKey: null,
        executionEnabled: false,
      });
      return;
    }

    if (!wallet.address || !wallet.isTestnet) {
      setState({
        up: buildBlockedLeg("up", receipt.upStrike || receipt.upperStrike, "Connect a Sui Testnet wallet before redeem preflight."),
        down: buildBlockedLeg("down", receipt.downStrike || receipt.lowerStrike, "Connect a Sui Testnet wallet before redeem preflight."),
        isChecking: false,
        message: "Connect a Sui Testnet wallet before redeem preflight.",
        dependencyKey,
        executionEnabled: false,
      });
      return;
    }

    setState((current) => ({
      ...current,
      isChecking: true,
      message: "Checking PredictManager positions and redeem preflight...",
      dependencyKey,
      executionEnabled: false,
    }));

    const up = await inspectLeg({ receipt, direction: "up", sender: wallet.address, client });
    const down = await inspectLeg({ receipt, direction: "down", sender: wallet.address, client });

    if (requestId.current !== currentRequestId) {
      return;
    }

    const passed = up.preflightPassed || down.preflightPassed;
    setState({
      up,
      down,
      isChecking: false,
      message: passed
        ? "Redeem preflight passed for at least one leg. DeepVol-12 controlled execution still requires both legs and exact receipt gates."
        : "Redeem preflight is blocked. Review the leg diagnostics before attempting a future redeem.",
      dependencyKey,
      executionEnabled: false,
    });
  }, [client, dependencyKey, receipt, wallet.address, wallet.isTestnet]);

  const stale = state.dependencyKey !== null && state.dependencyKey !== dependencyKey;
  const upStrike = receipt?.upStrike || receipt?.upperStrike || state.up.strike;
  const downStrike = receipt?.downStrike || receipt?.lowerStrike || state.down.strike;
  const displayState = {
    ...state,
    up: { ...state.up, strike: upStrike, receiptQuantityAtomic: receipt?.quantity ?? state.up.receiptQuantityAtomic },
    down: { ...state.down, strike: downStrike, receiptQuantityAtomic: receipt?.quantity ?? state.down.receiptQuantityAtomic },
    stale,
    receipt,
    walletAddress: wallet.address,
    walletConnected: wallet.isConnected,
    walletTestnet: wallet.isTestnet,
    existingAttempt,
  };
  const executionBlockers = redeemExecutionBlockers(displayState);
  const canExecute = executionBlockers.length === 0 && !executionInFlight.current && transactionStatus.state !== "awaiting_wallet";

  async function executeControlledRedeem() {
    if (!receipt || !wallet.address) {
      setTransactionStatus({
        state: "blocked_unconfirmed",
        error: executionBlockers.join(" ") || "Controlled redeem is blocked by the current receipt or wallet state.",
      });
      return;
    }

    if (executionInFlight.current) {
      setTransactionStatus({
        state: "blocked_unconfirmed",
        error: "A controlled redeem attempt is already in progress in this browser profile.",
      });
      return;
    }

    const latestAttempt = readControlledRedeemAttempt(DEEPVOL_STORAGE_KEYS, receipt.receiptId);
    const latestBlockers = redeemExecutionBlockers({
      ...displayState,
      existingAttempt: latestAttempt,
    });

    if (latestBlockers.length > 0 || transactionStatus.state === "awaiting_wallet") {
      setTransactionStatus({
        state: "blocked_unconfirmed",
        error: latestBlockers.join(" ") || "Controlled redeem is already awaiting wallet review.",
      });
      return;
    }

    executionInFlight.current = true;
    persistControlledRedeemAttempt(DEEPVOL_STORAGE_KEYS, {
      receiptId: receipt.receiptId,
      walletAddress: wallet.address,
      status: "wallet_prompted",
      attemptedAtMs: Date.now(),
    });
    setReconciliation(null);
    setTransactionStatus({
      state: "building",
      message: "Re-reading receipt, positions, balance, and preflight before wallet review.",
    });

    try {
      const fresh = await buildFreshControlledRedeem({
        client,
        sender: wallet.address,
        receiptId: receipt.receiptId,
      });

      setState((current) => ({
        ...current,
        up: fresh.up,
        down: fresh.down,
        dependencyKey: buildRedeemDependencyKey(fresh.receipt, wallet.address, wallet.isTestnet),
        message: "Fresh controlled redeem preflight passed for both receipt-scoped legs.",
      }));

      const promptAttempt = readControlledRedeemAttempt(DEEPVOL_STORAGE_KEYS, receipt.receiptId);
      if (!promptAttempt || promptAttempt.walletAddress !== wallet.address || promptAttempt.status !== "wallet_prompted") {
        throw new Error("Controlled redeem attempt record changed before wallet review.");
      }

      setTransactionStatus({
        state: "awaiting_wallet",
        message: "Confirm the one controlled DeepVol-12 redeem transaction in your Sui Testnet wallet.",
      });

      signAndExecuteTransaction.mutate(
        {
          transaction: fresh.transaction,
          chain: TESTNET_CHAIN,
        },
        {
          onSuccess: async (result) => {
            const digest = result.digest;
            const explorerUrl = buildSuiExplorerTransactionUrl(digest);

            persistControlledRedeemAttempt(DEEPVOL_STORAGE_KEYS, {
              receiptId: receipt.receiptId,
              walletAddress: wallet.address!,
              status: "success",
              attemptedAtMs: Date.now(),
              digest,
            });

            const summary = await reconcileRedeemResult({
              client,
              sender: wallet.address!,
              receipt: fresh.receipt,
              storedRecord,
              managerBalanceBeforeAtomic: fresh.managerBalanceBeforeAtomic,
              upBefore: fresh.up,
              downBefore: fresh.down,
              result,
              digest,
              explorerUrl,
            });

            setReconciliation(summary);
            setTransactionStatus({
              state: "success",
              digest,
              explorerUrl,
              message: summary.status === "reconciled"
                ? "Controlled browser redeem succeeded and reconciled against events plus manager readback."
                : "Controlled browser redeem succeeded, but reconciliation warnings need review.",
            });
            executionInFlight.current = false;
            void queryClient.invalidateQueries({ queryKey: ["deepvol-portfolio"] });
          },
          onError: (error) => {
            const message = translateDeepBookPredictError(error);
            persistControlledRedeemAttempt(DEEPVOL_STORAGE_KEYS, {
              receiptId: receipt.receiptId,
              walletAddress: wallet.address!,
              status: "failed",
              attemptedAtMs: Date.now(),
              error: message,
            });
            setTransactionStatus({ state: "failed", error: message });
            executionInFlight.current = false;
          },
        },
      );
    } catch (error) {
      setTransactionStatus({
        state: "blocked_unconfirmed",
        error: translateDeepBookPredictError(error),
      });
      executionInFlight.current = false;
    }
  }

  return {
    ...displayState,
    executionEnabled: canExecute,
    executionBlockers,
    transactionStatus,
    reconciliation: reconciliation ?? storedRecord?.redeemValidation ?? null,
    runPreflight,
    executeControlledRedeem,
    canRunPreflight: Boolean(receipt && wallet.address && wallet.isTestnet && !state.isChecking),
    canExecute,
  };
}

async function buildFreshControlledRedeem({
  client,
  sender,
  receiptId,
}: {
  client: Parameters<typeof readBinaryPositionQuantity>[0]["client"] & Parameters<typeof readMoveReceipt>[0];
  sender: string;
  receiptId: string;
}) {
  const receipt = await readMoveReceipt(client, receiptId);
  const receiptBlockers = validateFreshControlledReceipt(receipt, sender);

  if (receiptBlockers.length > 0) {
    throw new Error(receiptBlockers.join(" "));
  }

  const managerBalanceBefore = await devInspectManagerBalance({
    client,
    sender,
    managerId: receipt.predictManagerId,
    config: DEEPBOOK_PREDICT_TESTNET,
  });
  const up = await inspectLeg({ receipt, direction: "up", sender, client });
  const down = await inspectLeg({ receipt, direction: "down", sender, client });
  const blockers = [up, down]
    .filter((leg) => !leg.preflightPassed || leg.preflightQuantityAtomic !== CONTROLLED_REDEEM_QUANTITY)
    .map((leg) => leg.blocker || `${leg.direction.toUpperCase()} preflight quantity is not the approved receipt-scoped quantity.`);

  if (blockers.length > 0) {
    throw new Error(blockers.join(" "));
  }

  const combinedPreflight = await devInspectRedeemBinaryPositions({
    client,
    sender,
    managerId: receipt.predictManagerId,
    oracleObjectId: receipt.oracleId,
    legs: [
      {
        oracleId: receipt.oracleId,
        expiry: receipt.expiry,
        strike: CONTROLLED_REDEEM_UP_STRIKE,
        direction: "up",
        quantity: CONTROLLED_REDEEM_QUANTITY,
      },
      {
        oracleId: receipt.oracleId,
        expiry: receipt.expiry,
        strike: CONTROLLED_REDEEM_DOWN_STRIKE,
        direction: "down",
        quantity: CONTROLLED_REDEEM_QUANTITY,
      },
    ],
    config: DEEPBOOK_PREDICT_TESTNET,
  });

  if (combinedPreflight.status !== "passed") {
    throw new Error(combinedPreflight.abort.constantName
      ? `${combinedPreflight.abort.constantName}: ${combinedPreflight.abort.message}`
      : combinedPreflight.abort.message);
  }

  return {
    receipt,
    managerBalanceBeforeAtomic: managerBalanceBefore.balanceAtomic,
    up,
    down,
    transaction: buildRedeemBinaryPositionsTransaction({
      managerId: receipt.predictManagerId,
      oracleObjectId: receipt.oracleId,
      legs: [
        {
          oracleId: receipt.oracleId,
          expiry: receipt.expiry,
          strike: CONTROLLED_REDEEM_UP_STRIKE,
          direction: "up",
          quantity: CONTROLLED_REDEEM_QUANTITY,
        },
        {
          oracleId: receipt.oracleId,
          expiry: receipt.expiry,
          strike: CONTROLLED_REDEEM_DOWN_STRIKE,
          direction: "down",
          quantity: CONTROLLED_REDEEM_QUANTITY,
        },
      ],
      config: DEEPBOOK_PREDICT_TESTNET,
      allowRealTestnetRedeem: true,
    }),
  };
}

async function inspectLeg({
  receipt,
  direction,
  sender,
  client,
}: {
  receipt: MoveReceipt;
  direction: "up" | "down";
  sender: string;
  client: Parameters<typeof readBinaryPositionQuantity>[0]["client"];
}): Promise<RedeemLegUiState> {
  const strike = direction === "up" ? receipt.upStrike || receipt.upperStrike : receipt.downStrike || receipt.lowerStrike;
  const receiptQuantityAtomic = receipt.quantity || null;
  const base = {
    direction,
    strike,
    receiptQuantityAtomic,
    managerPositionQuantityAtomic: null,
    preflightQuantityAtomic: null,
    redeemPayoutAtomic: null,
    preflightPassed: false,
  };

  if (!receipt.predictManagerId || !receipt.oracleId || !receipt.expiry || !strike || !receiptQuantityAtomic) {
    return { ...base, blocker: "Receipt readback is missing the PredictManager, oracle, expiry, strike, or quantity needed for redeem." };
  }

  try {
    const position = await readBinaryPositionQuantity({
      client,
      sender,
      managerId: receipt.predictManagerId,
      oracleId: receipt.oracleId,
      expiry: receipt.expiry,
      strike,
      direction,
      config: DEEPBOOK_PREDICT_TESTNET,
    });

    const managerPositionQuantityAtomic = position.quantity;
    const preflightQuantityAtomic = receiptScopedQuantity(managerPositionQuantityAtomic, receiptQuantityAtomic);

    if (BigInt(managerPositionQuantityAtomic) === 0n) {
      return { ...base, managerPositionQuantityAtomic, blocker: "No underlying position quantity is available for this leg." };
    }

    if (BigInt(preflightQuantityAtomic) === 0n) {
      return { ...base, managerPositionQuantityAtomic, preflightQuantityAtomic, blocker: "No receipt-scoped position quantity is available for this leg." };
    }

    let redeemPayoutAtomic: string | null = null;

    try {
      const quote = await devInspectBinaryQuote({
        client,
        sender,
        oracleId: receipt.oracleId,
        oracleObjectId: receipt.oracleId,
        expiry: receipt.expiry,
        strike,
        direction,
        quantity: preflightQuantityAtomic,
        config: DEEPBOOK_PREDICT_TESTNET,
      });
      redeemPayoutAtomic = quote.redeemPayoutAtomic;
    } catch (error) {
      return {
        ...base,
        managerPositionQuantityAtomic,
        preflightQuantityAtomic,
        blocker: `Redeem payout preview blocked: ${formatError(error)}`,
      };
    }

    const preflight = await devInspectRedeemBinaryPosition({
      client,
      sender,
      managerId: receipt.predictManagerId,
      oracleId: receipt.oracleId,
      oracleObjectId: receipt.oracleId,
      expiry: receipt.expiry,
      strike,
      direction,
      quantity: preflightQuantityAtomic,
      config: DEEPBOOK_PREDICT_TESTNET,
    });

    if (preflight.status !== "passed") {
      return {
        ...base,
        managerPositionQuantityAtomic,
        preflightQuantityAtomic,
        redeemPayoutAtomic,
        blocker: preflight.abort.constantName
          ? `${preflight.abort.constantName}: ${preflight.abort.message}`
          : preflight.abort.message,
      };
    }

    return {
      ...base,
      managerPositionQuantityAtomic,
      preflightQuantityAtomic,
      redeemPayoutAtomic,
      preflightPassed: true,
      blocker: null,
    };
  } catch (error) {
    return { ...base, blocker: formatError(error) };
  }
}

async function reconcileRedeemResult({
  client,
  sender,
  receipt,
  storedRecord,
  managerBalanceBeforeAtomic,
  upBefore,
  downBefore,
  result,
  digest,
  explorerUrl,
}: {
  client: Parameters<typeof readBinaryPositionQuantity>[0]["client"];
  sender: string;
  receipt: MoveReceipt;
  storedRecord: StoredDeepVolReceipt | null;
  managerBalanceBeforeAtomic: string | null;
  upBefore: RedeemLegUiState;
  downBefore: RedeemLegUiState;
  result: Parameters<typeof parsePositionRedeemedEvents>[0];
  digest: string;
  explorerUrl: string;
}): Promise<RedeemReconciliationSummary> {
  const events = parsePositionRedeemedEvents(result, DEEPBOOK_PREDICT_TESTNET);
  const upAfter = await inspectPositionAfter({ client, sender, receipt, direction: "up" });
  const downAfter = await inspectPositionAfter({ client, sender, receipt, direction: "down" });
  const managerBalanceAfter = await devInspectManagerBalance({
    client,
    sender,
    managerId: receipt.predictManagerId,
    config: DEEPBOOK_PREDICT_TESTNET,
  });
  const upEvent = findRedeemEvent(events, "up");
  const downEvent = findRedeemEvent(events, "down");
  const warnings = [
    ...validateLegReconciliation("up", upBefore, upAfter, upEvent),
    ...validateLegReconciliation("down", downBefore, downAfter, downEvent),
  ];
  const totalPayoutAtomic = sumPayouts([upEvent, downEvent]);

  if (events.length !== 2) {
    warnings.push(`Expected exactly two PositionRedeemed events, observed ${events.length}.`);
  }

  if (managerBalanceBeforeAtomic && managerBalanceAfter.balanceAtomic && totalPayoutAtomic) {
    const balanceDelta = BigInt(managerBalanceAfter.balanceAtomic) - BigInt(managerBalanceBeforeAtomic);

    if (balanceDelta !== BigInt(totalPayoutAtomic)) {
      warnings.push(`Manager DUSDC balance delta ${balanceDelta.toString()} does not match event payout ${totalPayoutAtomic}.`);
    }
  }

  const summary: RedeemReconciliationSummary = {
    status: warnings.length === 0 ? "reconciled" : "reconciliation_warning",
    warnings,
    digest,
    explorerUrl,
    managerBalanceBeforeAtomic,
    managerBalanceAfterAtomic: managerBalanceAfter.balanceAtomic,
    totalPayoutAtomic,
    up: buildStoredLegValidation("up", upBefore, upAfter, upEvent),
    down: buildStoredLegValidation("down", downBefore, downAfter, downEvent),
    events,
  };

  persistReceiptRedeemValidation(DEEPVOL_STORAGE_KEYS, storedRecord ?? {
    receiptId: receipt.receiptId,
    digest,
    seriesId: receipt.seriesId,
    owner: receipt.owner,
    createdAtMs: Date.now(),
  }, toStoredRedeemValidation(summary, receipt, sender));

  return summary;
}

async function inspectPositionAfter({
  client,
  sender,
  receipt,
  direction,
}: {
  client: Parameters<typeof readBinaryPositionQuantity>[0]["client"];
  sender: string;
  receipt: MoveReceipt;
  direction: "up" | "down";
}) {
  const strike = direction === "up" ? CONTROLLED_REDEEM_UP_STRIKE : CONTROLLED_REDEEM_DOWN_STRIKE;
  const position = await readBinaryPositionQuantity({
    client,
    sender,
    managerId: receipt.predictManagerId,
    oracleId: receipt.oracleId,
    expiry: receipt.expiry,
    strike,
    direction,
    config: DEEPBOOK_PREDICT_TESTNET,
  });

  return position.quantity;
}

function validateFreshControlledReceipt(receipt: MoveReceipt, sender: string): string[] {
  const blockers: string[] = [];

  if (receipt.receiptId.toLowerCase() !== CONTROLLED_REDEEM_RECEIPT_ID.toLowerCase()) {
    blockers.push("Fresh receipt readback does not match the approved DeepVol-12 receipt.");
  }

  if (receipt.owner.toLowerCase() !== CONTROLLED_REDEEM_OWNER.toLowerCase() || sender.toLowerCase() !== CONTROLLED_REDEEM_OWNER.toLowerCase()) {
    blockers.push("Fresh wallet or receipt owner does not match the approved DeepVol-12 owner.");
  }

  if (receipt.predictManagerId.toLowerCase() !== CONTROLLED_REDEEM_PREDICT_MANAGER_ID.toLowerCase()) {
    blockers.push("Fresh receipt PredictManager does not match the approved DeepVol-12 manager.");
  }

  if (receipt.oracleId.toLowerCase() !== CONTROLLED_REDEEM_ORACLE_ID.toLowerCase()) {
    blockers.push("Fresh receipt oracle does not match the approved DeepVol-12 oracle.");
  }

  if (receipt.expiry !== CONTROLLED_REDEEM_EXPIRY) {
    blockers.push("Fresh receipt expiry does not match the approved DeepVol-12 expiry.");
  }

  if (receipt.quantity !== CONTROLLED_REDEEM_QUANTITY) {
    blockers.push("Fresh receipt quantity does not match 10000.");
  }

  if ((receipt.upStrike || receipt.upperStrike) !== CONTROLLED_REDEEM_UP_STRIKE || (receipt.downStrike || receipt.lowerStrike) !== CONTROLLED_REDEEM_DOWN_STRIKE) {
    blockers.push("Fresh receipt strikes do not match the approved controlled strikes.");
  }

  if (receipt.status !== 0) {
    blockers.push("Fresh receipt status is not open.");
  }

  return blockers;
}

function findRedeemEvent(events: PositionRedeemedEvent[], direction: "up" | "down") {
  const isUp = direction === "up";
  const strike = direction === "up" ? CONTROLLED_REDEEM_UP_STRIKE : CONTROLLED_REDEEM_DOWN_STRIKE;

  return events.find((event) => event.fields?.isUp === isUp && event.fields.strike === strike) ?? null;
}

function validateLegReconciliation(
  direction: "up" | "down",
  before: RedeemLegUiState,
  afterQuantityAtomic: string,
  event: PositionRedeemedEvent | null,
): string[] {
  const warnings: string[] = [];

  if (!event?.fields) {
    warnings.push(`${direction.toUpperCase()} PositionRedeemed event was not parsed.`);
  } else {
    if (event.fields.quantity !== CONTROLLED_REDEEM_QUANTITY) {
      warnings.push(`${direction.toUpperCase()} event quantity ${event.fields.quantity ?? "missing"} does not match 10000.`);
    }

    if (event.fields.owner?.toLowerCase() !== CONTROLLED_REDEEM_OWNER.toLowerCase()) {
      warnings.push(`${direction.toUpperCase()} event owner does not match the approved wallet.`);
    }
  }

  if (before.managerPositionQuantityAtomic) {
    const expectedAfter = BigInt(before.managerPositionQuantityAtomic) - BigInt(CONTROLLED_REDEEM_QUANTITY);

    if (BigInt(afterQuantityAtomic) !== expectedAfter) {
      warnings.push(`${direction.toUpperCase()} position after ${afterQuantityAtomic} does not match expected ${expectedAfter.toString()}.`);
    }
  }

  return warnings;
}

function buildStoredLegValidation(
  direction: "up" | "down",
  before: RedeemLegUiState,
  afterQuantityAtomic: string,
  event: PositionRedeemedEvent | null,
): StoredDeepVolRedeemLegValidation {
  return {
    direction,
    strike: direction === "up" ? CONTROLLED_REDEEM_UP_STRIKE : CONTROLLED_REDEEM_DOWN_STRIKE,
    quantityAtomic: CONTROLLED_REDEEM_QUANTITY,
    payoutAtomic: event?.fields?.payoutAtomic ?? null,
    positionBeforeAtomic: before.managerPositionQuantityAtomic,
    positionAfterAtomic: afterQuantityAtomic,
    eventMatched: Boolean(event),
  };
}

function toStoredRedeemValidation(
  summary: RedeemReconciliationSummary,
  receipt: MoveReceipt,
  sender: string,
): StoredDeepVolRedeemValidation {
  return {
    status: summary.status,
    receiptId: receipt.receiptId,
    digest: summary.digest,
    explorerUrl: summary.explorerUrl,
    walletAddress: sender,
    executedAtMs: Date.now(),
    managerBalanceBeforeAtomic: summary.managerBalanceBeforeAtomic,
    managerBalanceAfterAtomic: summary.managerBalanceAfterAtomic,
    totalPayoutAtomic: summary.totalPayoutAtomic,
    warnings: summary.warnings,
    up: summary.up,
    down: summary.down,
  };
}

function sumPayouts(events: Array<PositionRedeemedEvent | null>): string | null {
  let total = 0n;
  let sawPayout = false;

  for (const event of events) {
    if (event?.fields?.payoutAtomic) {
      total += BigInt(event.fields.payoutAtomic);
      sawPayout = true;
    }
  }

  return sawPayout ? total.toString() : null;
}

function buildRedeemDependencyKey(receipt: MoveReceipt | null, walletAddress: string | null, walletTestnet: boolean) {
  return [
    walletAddress ?? "",
    walletTestnet ? "testnet" : "not-testnet",
    receipt?.receiptId ?? "",
    receipt?.predictManagerId ?? "",
    receipt?.oracleId ?? "",
    receipt?.expiry ?? "",
    receipt?.upStrike ?? receipt?.upperStrike ?? "",
    receipt?.downStrike ?? receipt?.lowerStrike ?? "",
    receipt?.quantity ?? "",
  ].join(":");
}

function buildBlockedLeg(direction: "up" | "down", strike: string | null, blocker: string): RedeemLegUiState {
  return {
    direction,
    strike,
    receiptQuantityAtomic: null,
    managerPositionQuantityAtomic: null,
    preflightQuantityAtomic: null,
    redeemPayoutAtomic: null,
    preflightPassed: false,
    blocker,
  };
}

function receiptScopedQuantity(managerPositionQuantityAtomic: string, receiptQuantityAtomic: string): string {
  const managerQuantity = BigInt(managerPositionQuantityAtomic);
  const receiptQuantity = BigInt(receiptQuantityAtomic);
  return (managerQuantity < receiptQuantity ? managerQuantity : receiptQuantity).toString();
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
