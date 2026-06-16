import { useRangeTradeMachine } from "@rangepilot/deepvol-trading-react";
import { MachineActionCard, type ProductMachinePanelProps } from "./MachineActionCard";

export function RangeActionPanel(props: ProductMachinePanelProps) {
  const machine = useRangeTradeMachine();
  return <MachineActionCard product="RANGE" machine={machine} {...props} />;
}
