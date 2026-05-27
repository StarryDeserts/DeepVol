import { usePredictManagerSession } from "./usePredictManagerSession";

export function useDeepVolPredictManager() {
  const session = usePredictManagerSession();

  return {
    ...session,
    managerId: session.predictManagerId,
    setManualManagerId: session.setManualManager,
  };
}
