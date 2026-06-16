import { useDownTradeMachine } from "@deepvol/trading-react";
import { MachineActionCard, type ProductMachinePanelProps } from "./MachineActionCard";

export function DownActionPanel(props: ProductMachinePanelProps) {
  const machine = useDownTradeMachine();
  return <MachineActionCard product="DOWN" machine={machine} {...props} />;
}
