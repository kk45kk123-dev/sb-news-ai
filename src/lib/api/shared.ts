/** Simulated network latency so loading/skeleton states have something real to show. */
export function networkDelay(ms = 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
