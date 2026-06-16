import { useUpTradeMachine } from "@rangepilot/deepvol-trading-react";
import { MachineActionCard, type ProductMachinePanelProps } from "./MachineActionCard";

export function UpActionPanel(props: ProductMachinePanelProps) {
  const machine = useUpTradeMachine();
  return <MachineActionCard product="UP" machine={machine} {...props} />;
}
