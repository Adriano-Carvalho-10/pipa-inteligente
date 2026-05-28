import { useRef } from "react";

type noop = (...args: any[]) => any;

// Cria uma referência estável para uma função, evitando recriações desnecessárias sem depender de useCallback
export function usePersistFn<T extends noop>(fn: T) {
  const fnRef = useRef<T>(fn);
  // Atualiza a referência a cada render para sempre apontar para a versão mais recente da função
  fnRef.current = fn;

  const persistFn = useRef<T>(null);
  if (!persistFn.current) {
    persistFn.current = function (this: unknown, ...args) {
      return fnRef.current!.apply(this, args);
    } as T;
  }

  return persistFn.current!;
}
