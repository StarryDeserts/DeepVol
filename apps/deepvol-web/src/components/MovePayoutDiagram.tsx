type MovePayoutDiagramProps = {
  lowerStrike?: string | null;
  upperStrike?: string | null;
};

export function MovePayoutDiagram({ lowerStrike, upperStrike }: MovePayoutDiagramProps) {
  return (
    <section className="moveDiagram" aria-label="BTC MOVE payoff zones">
      <div className="moveDiagramTrack">
        <span className="moveDiagramZone moveDiagramZone-win">DOWN leg</span>
        <span className="moveDiagramZone moveDiagramZone-loss">Premium risk zone</span>
        <span className="moveDiagramZone moveDiagramZone-win">UP leg</span>
      </div>
      <div className="moveDiagramLabels">
        <span>BTC below {lowerStrike ?? "lower strike"}</span>
        <span>BTC stays inside range</span>
        <span>BTC above {upperStrike ?? "upper strike"}</span>
      </div>
    </section>
  );
}
