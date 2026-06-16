import type { MoveReceipt } from "@deepvol/types/deepVol";
import type { ControlledRedeemAttempt } from "../lib/deepVolReceiptStorage";
import {
  CONTROLLED_REDEEM_DOWN_STRIKE,
  CONTROLLED_REDEEM_EXPIRY,
  CONTROLLED_REDEEM_ORACLE_ID,
  CONTROLLED_REDEEM_OWNER,
  CONTROLLED_REDEEM_PREDICT_MANAGER_ID,
  CONTROLLED_REDEEM_QUANTITY,
  CONTROLLED_REDEEM_RECEIPT_ID,
  CONTROLLED_REDEEM_UP_STRIKE,
} from "../lib/constants";
import type { RedeemPreflightUiState } from "./useDeepVolRedeemPreflight";

export type RedeemExecutionGateInput = RedeemPreflightUiState & {
  stale: boolean;
  receipt: MoveReceipt | null;
  walletAddress: string | null;
  walletConnected: boolean;
  walletTestnet: boolean;
  existingAttempt: ControlledRedeemAttempt | null;
};

export function redeemExecutionBlockers(state: RedeemExecutionGateInput): string[] {
  const blockers: string[] = [];

  if (!state.walletConnected || !state.walletAddress) {
    blockers.push("Connect the controlled Sui Testnet wallet before redeem execution.");
  } else if (normalizeAddress(state.walletAddress) !== normalizeAddress(CONTROLLED_REDEEM_OWNER)) {
    blockers.push("Connected wallet does not match the approved DeepVol-12 receipt owner.");
  }

  if (!state.walletTestnet) {
    blockers.push("Switch the connected wallet to Sui Testnet before redeem execution.");
  }

  if (!state.receipt) {
    blockers.push("Receipt readback is required before redeem execution.");
  } else {
    blockers.push(...controlledReceiptBlockers(state.receipt));
  }

  if (state.stale) {
    blockers.push("Run redeem preflight again for the current wallet and receipt state.");
  }

  if (!state.up.preflightPassed || !state.down.preflightPassed) {
    blockers.push("Both UP and DOWN legs must pass explicit redeem preflight.");
  }

  if (state.up.preflightQuantityAtomic !== CONTROLLED_REDEEM_QUANTITY || state.down.preflightQuantityAtomic !== CONTROLLED_REDEEM_QUANTITY) {
    blockers.push("Both redeem preflight quantities must equal the approved receipt-scoped quantity of 10000.");
  }

  if (state.existingAttempt) {
    blockers.push("A controlled redeem attempt is already recorded for this receipt in this browser profile.");
  }

  return blockers;
}

export function controlledReceiptBlockers(receipt: MoveReceipt): string[] {
  const blockers: string[] = [];

  if (normalizeAddress(receipt.receiptId) !== normalizeAddress(CONTROLLED_REDEEM_RECEIPT_ID)) {
    blockers.push("This is not the approved DeepVol-12 controlled receipt.");
  }

  if (normalizeAddress(receipt.owner) !== normalizeAddress(CONTROLLED_REDEEM_OWNER)) {
    blockers.push("Receipt owner does not match the approved DeepVol-12 owner.");
  }

  if (normalizeAddress(receipt.predictManagerId) !== normalizeAddress(CONTROLLED_REDEEM_PREDICT_MANAGER_ID)) {
    blockers.push("Receipt PredictManager does not match the approved controlled manager.");
  }

  if (normalizeAddress(receipt.oracleId) !== normalizeAddress(CONTROLLED_REDEEM_ORACLE_ID)) {
    blockers.push("Receipt oracle does not match the approved controlled oracle.");
  }

  if (receipt.expiry !== CONTROLLED_REDEEM_EXPIRY) {
    blockers.push("Receipt expiry does not match the approved controlled expiry.");
  }

  if ((receipt.upStrike || receipt.upperStrike) !== CONTROLLED_REDEEM_UP_STRIKE) {
    blockers.push("Receipt UP strike does not match the approved controlled UP strike.");
  }

  if ((receipt.downStrike || receipt.lowerStrike) !== CONTROLLED_REDEEM_DOWN_STRIKE) {
    blockers.push("Receipt DOWN strike does not match the approved controlled DOWN strike.");
  }

  if (receipt.quantity !== CONTROLLED_REDEEM_QUANTITY) {
    blockers.push("Receipt quantity does not match the approved controlled quantity of 10000.");
  }

  if (receipt.status !== 0) {
    blockers.push("Receipt is not open; local guided redeem execution is blocked.");
  }

  return blockers;
}

function normalizeAddress(value: string): string {
  return value.toLowerCase();
}
