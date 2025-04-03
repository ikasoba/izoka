export type Identifical =
  | Symbol
  | Function
  ;

declare const $TypeOf: unique symbol;

export interface TypeSymbol<T> {
  id: Identifical;
  isUnique: boolean;
  generics?: WeakMap<TypeSymbolable<T>, TypeSymbolable<T>>;
  [$TypeOf]: T;
}

export type UnwrapTypeSymbol<T extends TypeSymbolable<unknown>[]> =
  { [ K in keyof T ]: T[K] extends TypeSymbolable<infer R> ? R : never; }

export type TypeSymbolable<T> =
  | TypeSymbol<T>
  | (new (...args: any) => T)
  ;

export const typeSymbolableToString = (t: TypeSymbolable<unknown>): string => {
  if (typeof t == "function") {
    return t.name;
  } else if (typeof t.id == "function") {
    return t.id.name;
  } else {
    return t.id.description ?? "<unknown>";
  }
}

const $SymbolOf: unique symbol = Symbol();

export const decorateSymbolOf = <T>(o: object, id: TypeSymbol<T>) => {
  Object.defineProperty(o, $SymbolOf, {
    value: id
  })
}

export const getSymbolOf = <T>(o: object) => {
  if ($SymbolOf in o) {
    return o[$SymbolOf] as TypeSymbol<T>
  } else {
    return;
  }
}

export const symbolOf = <T>({ name, id = Symbol(name), isUnique = true }: { name?: string, id?: Identifical; isUnique?: boolean } = {}) => {  
  return {
    id,
    isUnique,
  } as TypeSymbol<T>
}

export const genericOf = <R>(id: TypeSymbolable<unknown>, param: TypeSymbolable<unknown>, { isUnique = true } = {}): TypeSymbolable<R> => {
  const s = getSymbolOf(id);
  if (!s) {
    throw new Error("object is not TypeSymbolable.");
  }

  const cached = s.generics?.get(param);
  if (cached) return cached as TypeSymbolable<R>;

  const res = symbolOf<R>({ name: `${typeSymbolableToString(s)}<${typeSymbolableToString(param)}>`, isUnique });

  s.generics ??= new WeakMap();
  s.generics.set(param, res);

  return res;
}
