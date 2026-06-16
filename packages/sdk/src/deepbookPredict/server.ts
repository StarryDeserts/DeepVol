import type {
  DeepBookPredictAskBounds,
  DeepBookPredictManagerPnl,
  DeepBookPredictManagerPositionsSummary,
  DeepBookPredictManagerSummary,
  DeepBookPredictNetworkConfig,
  DeepBookPredictOraclePriceUpdate,
  DeepBookPredictOracleRecord,
  DeepBookPredictOracleState,
  DeepBookPredictPredictState,
  DeepBookPredictRangeMintQuery,
  DeepBookPredictRangeMintRecord,
  DeepBookPredictServerStatus,
  DeepBookPredictSviUpdate,
  DeepBookPredictTradeRecord,
  DeepBookPredictVaultSummary,
} from "@deepvol/types/deepbookPredict";
import { resolveDeepBookPredictConfig } from "./config.ts";

export class DeepBookPredictServerError extends Error {
  readonly status: number;
  readonly url: string;
  readonly body: string;

  constructor(message: string, status: number, url: string, body: string) {
    super(message);
    this.name = "DeepBookPredictServerError";
    this.status = status;
    this.url = url;
    this.body = body;
  }
}

export type DeepBookPredictServerClientOptions = {
  config?: DeepBookPredictNetworkConfig;
  fetch?: typeof fetch;
};

export type DiscoverDefaultOracleOptions = {
  predictId?: string;
  underlyingAsset?: string;
  nowMs?: number;
};

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function buildQueryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export class DeepBookPredictServerClient {
  private readonly config: DeepBookPredictNetworkConfig;
  private readonly fetchImpl: typeof fetch;

  constructor(options: DeepBookPredictServerClientOptions = {}) {
    this.config = resolveDeepBookPredictConfig(options.config);
    this.fetchImpl = options.fetch ?? fetch;
  }

  async requestJson<T>(path: string): Promise<T> {
    const url = joinUrl(this.config.publicServer, path);
    const response = await this.fetchImpl(url, {
      headers: { accept: "application/json" },
    });

    const body = await response.text();

    if (!response.ok) {
      throw new DeepBookPredictServerError(
        `DeepBook Predict server request failed with ${response.status}`,
        response.status,
        url,
        body,
      );
    }

    return JSON.parse(body) as T;
  }

  getStatus(): Promise<DeepBookPredictServerStatus> {
    return this.requestJson<DeepBookPredictServerStatus>("/status");
  }

  getPredictState(
    predictId = this.config.predictId,
  ): Promise<DeepBookPredictPredictState> {
    return this.requestJson<DeepBookPredictPredictState>(
      `/predicts/${predictId}/state`,
    );
  }

  getOracles(
    predictId = this.config.predictId,
  ): Promise<DeepBookPredictOracleRecord[]> {
    return this.requestJson<DeepBookPredictOracleRecord[]>(
      `/predicts/${predictId}/oracles`,
    );
  }

  getQuoteAssets(predictId = this.config.predictId): Promise<string[]> {
    return this.requestJson<string[]>(`/predicts/${predictId}/quote-assets`);
  }

  getVaultSummary(
    predictId = this.config.predictId,
  ): Promise<DeepBookPredictVaultSummary> {
    return this.requestJson<DeepBookPredictVaultSummary>(
      `/predicts/${predictId}/vault/summary`,
    );
  }

  getOracleState(oracleId: string): Promise<DeepBookPredictOracleState> {
    return this.requestJson<DeepBookPredictOracleState>(
      `/oracles/${oracleId}/state`,
    );
  }

  getOracleAskBounds(
    oracleId: string,
  ): Promise<DeepBookPredictAskBounds | null> {
    return this.requestJson<DeepBookPredictAskBounds | null>(
      `/oracles/${oracleId}/ask-bounds`,
    );
  }

  getLatestOraclePrice(
    oracleId: string,
  ): Promise<DeepBookPredictOraclePriceUpdate> {
    return this.requestJson<DeepBookPredictOraclePriceUpdate>(
      `/oracles/${oracleId}/prices/latest`,
    );
  }

  getLatestOracleSvi(oracleId: string): Promise<DeepBookPredictSviUpdate> {
    return this.requestJson<DeepBookPredictSviUpdate>(
      `/oracles/${oracleId}/svi/latest`,
    );
  }

  getOracleTrades(oracleId: string): Promise<DeepBookPredictTradeRecord[]> {
    return this.requestJson<DeepBookPredictTradeRecord[]>(`/trades/${oracleId}`);
  }

  getManagerSummary(managerId: string): Promise<DeepBookPredictManagerSummary> {
    return this.requestJson<DeepBookPredictManagerSummary>(
      `/managers/${managerId}/summary`,
    );
  }

  getManagerPositionsSummary(
    managerId: string,
  ): Promise<DeepBookPredictManagerPositionsSummary> {
    return this.requestJson<DeepBookPredictManagerPositionsSummary>(
      `/managers/${managerId}/positions/summary`,
    );
  }

  getManagerPnl(managerId: string, range = "ALL"): Promise<DeepBookPredictManagerPnl> {
    return this.requestJson<DeepBookPredictManagerPnl>(
      `/managers/${managerId}/pnl${buildQueryString({ range })}`,
    );
  }

  getRangeMints(
    query: DeepBookPredictRangeMintQuery = {},
  ): Promise<DeepBookPredictRangeMintRecord[]> {
    return this.requestJson<DeepBookPredictRangeMintRecord[]>(
      `/ranges/minted${buildQueryString({
        manager_id: query.manager_id ?? query.managerId,
        oracle_id: query.oracle_id ?? query.oracleId,
        limit: query.limit,
        cursor: query.cursor,
      })}`,
    );
  }

  async discoverDefaultOracle(
    options: DiscoverDefaultOracleOptions = {},
  ): Promise<DeepBookPredictOracleRecord | null> {
    const oracles = await this.getOracles(options.predictId);
    const nowMs = options.nowMs ?? Date.now();
    const active = oracles
      .filter((oracle) => oracle.status === "active")
      .filter((oracle) => {
        const expiry = toFiniteNumber(oracle.expiry);
        return expiry !== null && expiry > nowMs;
      });

    const preferred = options.underlyingAsset
      ? active.filter(
          (oracle) => oracle.underlying_asset === options.underlyingAsset,
        )
      : active;

    return (
      [...(preferred.length > 0 ? preferred : active)].sort((left, right) => {
        return (
          (toFiniteNumber(left.expiry) ?? Number.MAX_SAFE_INTEGER) -
          (toFiniteNumber(right.expiry) ?? Number.MAX_SAFE_INTEGER)
        );
      })[0] ?? null
    );
  }
}

export function createDeepBookPredictServerClient(
  options: DeepBookPredictServerClientOptions = {},
): DeepBookPredictServerClient {
  return new DeepBookPredictServerClient(options);
}
