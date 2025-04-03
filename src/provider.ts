import { TypeSymbol, UnwrapTypeSymbol } from "./symbol.js";

export interface Provider<T> {
  provideTo: TypeSymbol<T>;
  requires: TypeSymbol<unknown>[];
  provider: ProviderFunction<T, UnwrapTypeSymbol<this["requires"]>>;
}

export type ProviderFunction<T, Requires extends unknown[]> =
  | ((requires: Requires) => T)
  | ((requires: Requires) => PromiseLike<T>)
  ;

export type Providable<T> =
  | Provider<T>
  | (new (...args: any) => T)
  ;

export const makeProvider = <T, R extends TypeSymbol<unknown>[]>(id: TypeSymbol<T>, requires: R, provider: ProviderFunction<T, UnwrapTypeSymbol<R>>) =>
  ({
    provideTo: id,
    requires,
    provider
  }) as Provider<T>
  ;

const $ProviderOf: unique symbol = Symbol();

export function decorateProviderOf<T>(o: object, provider: Provider<T>) {
  Object.defineProperty(o, $ProviderOf, {
    value: provider
  })
}

export function getProviderOf<T>(o: object) {
  if ($ProviderOf in o) {
    return o[$ProviderOf] as Provider<T>;
  } else {
    return;
  }
}
