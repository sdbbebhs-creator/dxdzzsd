// Tiny event bus: modules that write synced data to localStorage (FSRS settings, review logs, rank)
// call `notifyLocalChange()` so the cloud sync can push without those modules importing it.
const listeners = new Set<() => void>();

export function notifyLocalChange(): void {
  listeners.forEach((listener) => listener());
}

export function onLocalChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
