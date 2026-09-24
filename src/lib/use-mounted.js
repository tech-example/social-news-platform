import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

export function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function useCurrentTimestamp() {
  return useSyncExternalStore(
    emptySubscribe,
    () => Date.now(),
    () => 0
  );
}
