import { useMoveTradeMachine } from "@rangepilot/deepvol-trading-react";
import { MachineActionCard, type ProductMachinePanelProps } from "./MachineActionCard";

export function MoveActionPanel(props: ProductMachinePanelProps) {
  const machine = useMoveTradeMachine();
  return <MachineActionCard product="MOVE" machine={machine} {...props} />;
}
