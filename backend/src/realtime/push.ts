const listeners = new Map<string, Set<(e: any) => void>>();

export function pushRealtime(id: string, payload: any) {
  listeners.get(id)?.forEach((fn) => fn(payload));
}

export function subscribe(id: string, fn: (e: any) => void) {
  if (!listeners.has(id)) listeners.set(id, new Set());
  listeners.get(id)!.add(fn);
  return () => listeners.get(id)!.delete(fn);
}
