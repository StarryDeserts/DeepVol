import { useEffect, useMemo, useState } from "react";
import { AdvancedDetails } from "../components/AdvancedDetails";
import { BuyMoveReceiptCard } from "../components/BuyMoveReceiptCard";
import { MovePayoutDiagram } from "../components/MovePayoutDiagram";
import { MoveQuotePanel } from "../components/MoveQuotePanel";
import { DataGrid } from "../components/ui/DataGrid";
import { PageHero } from "../components/ui/PageHero";
import { StateCallout } from "../components/ui/StateCallout";
import { useDeepVolConfig } from "../hooks/useDeepVolConfig";
import { useDeepVolQuote } from "../hooks/useDeepVolQuote";
import { useSuiWallet } from "../hooks/useSuiWallet";
import { DEFAULT_MOVE_QUANTITY, DEEPVOL_STORAGE_KEYS } from "../lib/constants";
import { normalizePositiveIntegerInput, shortId } from "../lib/format";

export function BuyMovePage() {
  const wallet = useSuiWallet();
  const config = useDeepVolConfig();
  const [quantityInput, setQuantityInput] = useState(DEFAULT_MOVE_QUANTITY);
  const [predictManagerInput, setPredictManagerInput] = useState("");
  const storageKey = useMemo(
    () => wallet.address ? `${DEEPVOL_STORAGE_KEYS.predictManager}:${config.network}:${wallet.address}` : null,
    [config.network, wallet.address],
  );

  useEffect(() => {
    if (!storageKey) {
      setPredictManagerInput("");
      return;
    }

    setPredictManagerInput(window.localStorage.getItem(storageKey) ?? "");
  }, [storageKey]);

  const normalizedQuantity = normalizePositiveIntegerInput(quantityInput) ?? quantityInput;
  const predictManagerId = predictManagerInput.trim() || null;
  const quote = useDeepVolQuote({
    quantityInput: normalizedQuantity,
    predictManagerId,
  });

  function rememberPredictManager() {
    if (!storageKey || !predictManagerId) {
      return;
    }

    window.localStorage.setItem(storageKey, predictManagerId);
  }

  return (
    <div className="tradeWorkspace">
      <section className="tradeContextColumn">
        <PageHero eyebrow="BTC MOVE transaction" title="Open BTC MOVE">
          <p>
            Buy exposure to BTC leaving the configured range. DeepVol mints the UP and DOWN Predict legs together and returns a
            non-custodial but protocol-enforced receipt.
          </p>
        </PageHero>
        <MovePayoutDiagram lowerStrike={quote.series?.lowerStrike} upperStrike={quote.series?.upperStrike} />
        <StateCallout tone="info" title="Non-custodial boundary">
          The receipt records the DeepVol-created legs; underlying Predict positions stay in your PredictManager.
        </StateCallout>
        <section className="card tradeSetupCard">
          <div className="cardHeader">
            <div>
              <div className="eyebrow">Setup</div>
              <h2>Quantity and manager</h2>
            </div>
          </div>
          <DataGrid
            variant="compact"
            items={[
              {
                label: "Configured VolSeries",
                value: <span className="mono" title={config.configuredSeriesId}>{shortId(config.configuredSeriesId)}</span>,
              },
              {
                label: "ProtocolVault",
                value: <span className="mono" title={config.protocolVaultId ?? undefined}>{shortId(config.protocolVaultId)}</span>,
              },
              {
                label: "Predict object",
                value: <span className="mono" title={config.predictId}>{shortId(config.predictId)}</span>,
              },
              { label: "Quote asset", value: "DUSDC" },
            ]}
          />
          <label className="fieldLabel" htmlFor="move-quantity">
            Quantity
          </label>
          <input
            id="move-quantity"
            value={quantityInput}
            inputMode="numeric"
            aria-describedby="quantity-help"
            onChange={(event) => setQuantityInput(event.target.value)}
          />
          <small id="quantity-help" className="fieldHelp">
            Quantity is the binary leg quantity, not a DUSDC amount.
          </small>
          <label className="fieldLabel" htmlFor="predict-manager-id">
            PredictManager ID
          </label>
          <input
            id="predict-manager-id"
            value={predictManagerInput}
            placeholder="0x..."
            autoComplete="off"
            onChange={(event) => setPredictManagerInput(event.target.value)}
          />
          <button className="secondaryButton" type="button" disabled={!predictManagerId} onClick={rememberPredictManager}>
            Store PredictManager locally
          </button>
        </section>
      </section>

      <section className="tradeActionColumn">
        <MoveQuotePanel quote={quote} />
        <BuyMoveReceiptCard quote={quote} predictManagerId={predictManagerId} />
      </section>
      <AdvancedDetails />
    </div>
  );
}
