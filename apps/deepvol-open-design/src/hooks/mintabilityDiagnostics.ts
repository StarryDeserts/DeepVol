import type {
  BtcMoveMintableRangeAttempt,
  PrimitiveMintableStrikeAttempt,
  RangePrimitiveMintabilitySummary,
  RangePrimitiveMintableCandidateDiagnostic,
} from "@rangepilot/types/deepbookPredict";

export type RuntimeCandidateDiagnostic = {
  product: "MOVE" | "UP" | "DOWN" | "RANGE";
  candidateLabel: string;
  quoteStatus: "skipped" | "passed" | "failed";
  quoteCostAtomic: string | null;
  preflightStatus: "skipped" | "passed" | "failed";
  failureFamily: string | null;
  message: string | null;
  rawErrorSummary: string | null;
};

export type RuntimeMintabilitySummary = {
  totalCandidates: number;
  quotedCandidates: number;
  preflightPassedCandidates: number;
  failureCountsByFamily: Record<string, number>;
  firstFewFailures: RuntimeCandidateDiagnostic[];
  lastFailure: RuntimeCandidateDiagnostic | null;
  dominantFailure: string | null;
};

function addAtomicValues(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a || !b) return null;

  return (BigInt(a) + BigInt(b)).toString();
}

function dominantFailure(failureCountsByFamily: Record<string, number>): string | null {
  const entries = Object.entries(failureCountsByFamily).sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? null;
}

function summarizeDiagnostics(diagnostics: RuntimeCandidateDiagnostic[]): RuntimeMintabilitySummary {
  const failureCountsByFamily: Record<string, number> = {};
  const failed = diagnostics.filter((diagnostic) => diagnostic.failureFamily);

  for (const diagnostic of failed) {
    const family = diagnostic.failureFamily ?? "unknown";
    failureCountsByFamily[family] = (failureCountsByFamily[family] ?? 0) + 1;
  }

  return {
    totalCandidates: diagnostics.length,
    quotedCandidates: diagnostics.filter((diagnostic) => diagnostic.quoteStatus === "passed").length,
    preflightPassedCandidates: diagnostics.filter((diagnostic) => diagnostic.preflightStatus === "passed").length,
    failureCountsByFamily,
    firstFewFailures: failed.slice(0, 5),
    lastFailure: failed[failed.length - 1] ?? null,
    dominantFailure: dominantFailure(failureCountsByFamily),
  };
}

function moveLegFailureFamily(attempt: BtcMoveMintableRangeAttempt): string | null {
  return attempt.blockers[0] ?? attempt.up.blocker ?? attempt.down.blocker ?? null;
}

function moveAttemptMessage(attempt: BtcMoveMintableRangeAttempt): string | null {
  return attempt.up.message ?? attempt.down.message ?? attempt.blockers[0] ?? null;
}

function moveAttemptRawError(attempt: BtcMoveMintableRangeAttempt): string | null {
  return attempt.up.rawError ?? attempt.down.rawError ?? null;
}

export function summarizeMoveAttempts(attempts: BtcMoveMintableRangeAttempt[]): RuntimeMintabilitySummary {
  return summarizeDiagnostics(
    attempts.map((attempt) => {
      const upQuote = attempt.up.quote;
      const downQuote = attempt.down.quote;
      const upPreflightPassed = attempt.up.mintPreflight?.status === "passed";
      const downPreflightPassed = attempt.down.mintPreflight?.status === "passed";

      return {
        product: "MOVE",
        candidateLabel: `${attempt.candidate.lowerStrike} — ${attempt.candidate.upperStrike}`,
        quoteStatus: upQuote && downQuote ? "passed" : "failed",
        quoteCostAtomic: addAtomicValues(upQuote?.mintCostAtomic, downQuote?.mintCostAtomic),
        preflightStatus: upPreflightPassed && downPreflightPassed ? "passed" : upQuote && downQuote ? "failed" : "skipped",
        failureFamily: attempt.status === "passed" ? null : moveLegFailureFamily(attempt) ?? "unknown",
        message: moveAttemptMessage(attempt),
        rawErrorSummary: moveAttemptRawError(attempt),
      } satisfies RuntimeCandidateDiagnostic;
    }),
  );
}

export function summarizeBinaryAttempts(
  product: "UP" | "DOWN",
  attempts: PrimitiveMintableStrikeAttempt[],
): RuntimeMintabilitySummary {
  return summarizeDiagnostics(
    attempts.map((attempt) => ({
      product,
      candidateLabel: `${attempt.candidate.direction.toUpperCase()} ${attempt.candidate.strike}`,
      quoteStatus: attempt.quote ? "passed" : "failed",
      quoteCostAtomic: attempt.quote?.mintCostAtomic ?? null,
      preflightStatus: attempt.mintPreflight?.status === "passed" ? "passed" : attempt.quote ? "failed" : "skipped",
      failureFamily: attempt.status === "passed" ? null : attempt.blocker ?? "unknown",
      message: attempt.message,
      rawErrorSummary: attempt.rawError,
    })),
  );
}

function mapRangeDiagnostic(
  diagnostic: RangePrimitiveMintableCandidateDiagnostic,
): RuntimeCandidateDiagnostic {
  return {
    product: "RANGE",
    candidateLabel: `${diagnostic.candidate.lowerStrike} — ${diagnostic.candidate.higherStrike}`,
    quoteStatus: diagnostic.quoteStatus,
    quoteCostAtomic: diagnostic.quoteCostAtomic,
    preflightStatus: diagnostic.preflightStatus,
    failureFamily: diagnostic.failureFamily,
    message: diagnostic.message,
    rawErrorSummary: diagnostic.rawErrorSummary,
  };
}

export function summarizeRangeSummary(
  summary: RangePrimitiveMintabilitySummary | null,
): RuntimeMintabilitySummary {
  if (!summary) {
    return {
      totalCandidates: 0,
      quotedCandidates: 0,
      preflightPassedCandidates: 0,
      failureCountsByFamily: {},
      firstFewFailures: [],
      lastFailure: null,
      dominantFailure: null,
    };
  }

  const failureCountsByFamily: Record<string, number> = {};
  for (const [family, count] of Object.entries(summary.failureCountsByFamily)) {
    failureCountsByFamily[family] = count ?? 0;
  }

  return {
    totalCandidates: summary.totalCandidates,
    quotedCandidates: summary.quotedCandidates,
    preflightPassedCandidates: summary.preflightPassedCandidates,
    failureCountsByFamily,
    firstFewFailures: summary.firstFewFailures.map(mapRangeDiagnostic),
    lastFailure: summary.lastFailure ? mapRangeDiagnostic(summary.lastFailure) : null,
    dominantFailure: dominantFailure(failureCountsByFamily),
  };
}

export function classifyBalanceFailure(message: string | null | undefined): boolean {
  if (!message) return false;

  return /balance|insufficient|deposit|PredictManager DUSDC/i.test(message);
}
