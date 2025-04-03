import "reflect-metadata";
import { symbolOf, decorateSymbolOf, getSymbolOf, TypeSymbol, TypeSymbolable, UnwrapTypeSymbol } from "./symbol.js";
import { decorateProviderOf, getProviderOf, makeProvider, Provider, ProviderFunction } from "./provider.js";

const DecoratorKey: unique symbol = Symbol();

export interface DecoratorState {
  id?: TypeSymbol<unknown>;
  inject?: (
    | { type: "field"; key: string; id: TypeSymbolable<unknown>; }
    | { type: "param"; i: number; id: TypeSymbolable<unknown>; }
  )[];
}

function initializeDecoratorState(target: any) {
  if (!Reflect.hasMetadata(DecoratorKey, target)) {
    const o = {};

    Reflect.defineMetadata(DecoratorKey, o, target);

    return o
  }

  return Reflect.getMetadata(DecoratorKey, target);
}

export function Injectable<T>(id?: TypeSymbol<T>) {
  return <Class extends new (...args: any) => T>(target: Class) => {
    const state: DecoratorState = initializeDecoratorState(target);

    state.id = id ?? symbolOf({ id: target });
    if (!id) {
      decorateSymbolOf(target, state.id);
    }
  }
}

export function Inject<T>(id?: TypeSymbolable<T>) {
  function decorate<Instance extends object>(target: Instance, member: string | undefined, parameterIndex: number): void;
  function decorate<Instance extends object>(target: Instance, propertyKey: string): void;
  function decorate<Instance extends object>(target: Instance, key: string | undefined, parameterIndex?: number, ...additionals: any) {
    if (typeof parameterIndex == "number") {
      const t = Reflect.getMetadata("design:paramtypes", target);
      if (t?.length >= 1) {
        id = t[0];
      }

      if (key != undefined) {
        throw new Error("Cannot inject dependency to method parameter.");
      }

      const state: DecoratorState = initializeDecoratorState(target);

      state.inject ??= [];

      state.inject.push({
        type: "param",
        i: parameterIndex,
        id: id!
      })
    } else {
      const t = Reflect.getMetadata("design:type", target);
      if (t) {
        id = t;
      }

      const state: DecoratorState = initializeDecoratorState(target.constructor);

      state.inject ??= [];

      state.inject.push({
        type: "field",
        key: key!,
        id: id!
      })
    }
  }

  return decorate;
}

export function defineProvider<T, R extends TypeSymbolable<unknown>[]>(provideTo: TypeSymbol<T>, requires: R, fn: ProviderFunction<T, UnwrapTypeSymbol<R>>): Provider<T> {
  function Dummy() { }
  Dummy.provideTo = provideTo;
  Dummy.requires = requires;
  Dummy.provider = fn;

  const p = Dummy as Provider<T>;

  decorateSymbolOf(p, provideTo);
  decorateProviderOf(p, p);

  return p;
}

export function createProvider<T, Class extends new (...args: any) => T>(cls: Class) {
  const cachedProvider = getProviderOf(cls);
  if (cachedProvider) {
    return cachedProvider;
  }

  if (!Reflect.hasMetadata(DecoratorKey, cls)) {
    throw new Error("Metadata is empty.");
  }

  const state: DecoratorState = initializeDecoratorState(cls);

  state.inject ??= [];

  const requiresMap = state.inject.map((val, idx) => {
    if (typeof val.id == "function") {
      val.id = getSymbolOf(val.id)!;
    }

    return { val, idx }
  });

  const params = requiresMap.filter((x): x is typeof x & { val: { type: "params" } } => x.val.type == "param");
  const fields = requiresMap.filter((x): x is typeof x & { val: { type: "field" } } => x.val.type == "field");

  const provider = makeProvider(state.id!, requiresMap.map(({ val: { id } }) => id as TypeSymbol<T>), requires => {
    const o = new cls(...params.map(x => {
      return requires[x.idx];
    }));

    for (const field of fields) {
      Object.defineProperty(o, field.val.key, { value: requires[field.idx] });
    }

    return o
  })

  decorateProviderOf(cls, provider);

  return provider;
}
