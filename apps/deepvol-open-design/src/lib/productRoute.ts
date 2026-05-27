export type MarketProduct = "MOVE" | "UP" | "DOWN" | "RANGE";

const PRODUCTS = new Set<MarketProduct>(["MOVE", "UP", "DOWN", "RANGE"]);

export function normalizeMarketProduct(value: string | null | undefined): MarketProduct {
  const normalized = value?.trim().toUpperCase();
  return PRODUCTS.has(normalized as MarketProduct) ? (normalized as MarketProduct) : "MOVE";
}

export function productHref(product: MarketProduct): string {
  return `/markets/btc?product=${product}`;
}

export function productFromSearch(search: string): MarketProduct {
  const params = new URLSearchParams(search);
  return normalizeMarketProduct(params.get("product") ?? params.get("type"));
}

export function legacyPrimitiveProductFromSearch(search: string): MarketProduct {
  const product = normalizeMarketProduct(new URLSearchParams(search).get("type"));
  return product === "MOVE" ? "UP" : product;
}
