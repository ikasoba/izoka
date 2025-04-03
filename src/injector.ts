import { createProvider } from "./decorator.js";
import { Providable, Provider } from "./provider.js";
import { getSymbolOf, TypeSymbol, TypeSymbolable, typeSymbolableToString, UnwrapTypeSymbol } from "./symbol.js";
import { CustomEventTarget } from "./utils/CustomEventTarget.js";
import { promiseWithResolvers } from "./utils/promiseResolver.js";

export class DependencyInjectorContext {
  constructor(
    private injectors = new Map<TypeSymbol<unknown>, Provider<unknown>[]>(),
    private providerCaches = new Map<TypeSymbol<unknown>, unknown>(),
    public eventTarget?: CustomEventTarget<{
      provided: CustomEvent<{
        provider: Provider<unknown>;
        provided: unknown;
      }>
    }>
  ) { }

  static from(providers: Providable<unknown>[]): DependencyInjectorContext {
    const injectors: DependencyInjectorContext["injectors"] = new Map();

    for (const p of providers) {
      if (typeof p == "function") {
        const provider = createProvider(p);

        const a = injectors.get(provider.provideTo) ?? [];

        a.push(provider);

        injectors.set(provider.provideTo, a);
      } else {
        const a = injectors.get(p.provideTo) ?? [];

        a.push(p);

        injectors.set(p.provideTo, a);
      }
    }

    return new DependencyInjectorContext(injectors);
  }

  async get<T>(id: TypeSymbolable<T>): Promise<T | T[]> {
    if (typeof id == "function") {
      const s = getSymbolOf(id);
      if (!s) {
        throw new Error("object is not TypeSymbolable.");
      }

      id = s as TypeSymbol<T>;
    }

    if (this.providerCaches.has(id)) {
      return this.providerCaches.get(id) as T;
    }

    const providers = this.injectors.get(id);
    if (!providers || providers.length <= 0) {
      throw new ErrorProviderNotFound();
    }

    await this.validateSafeProvidable(providers);

    if (providers.length == 1 || id.isUnique) {
      return await this.resolveAndProvide(providers[0]) as T;
    }

    const res: T[] = [];

    for (const p of providers) {
      res.push(await this.resolveAndProvide(p) as T);
    }

    return res;
  }

  private async validateSafeProvidable(providers: Provider<unknown>[]) {
    const ids = new Map<TypeSymbol<unknown>, Provider<unknown>[]>();
    const errors = new Map<TypeSymbol<unknown>, unknown[]>();

    for (const p of providers) {
      const providers = ids.get(p.provideTo);

      if (!providers || providers.length == 0) {
        ids.set(p.provideTo, [p]);

        continue;
      }

      if (p.provideTo.isUnique) {
        const errs = errors.get(p.provideTo) ?? [];

        if (errs.some(x => x instanceof ErrorMultipleProviderLoadedForUniqueSymbol)) {
          continue;
        }

        errs.push(new ErrorMultipleProviderLoadedForUniqueSymbol(p))

        errors.set(p.provideTo, errs);
      }
    }

    if (errors.size) {
      throw new ErrorProviderStructureValidationFailed(errors);
    }
  }

  private async resolveAndProvide<T>(provider: Provider<T>): Promise<T> {
    const requires = [];
    for (const req of provider.requires) {
      requires.push(await this.get(req))
    }

    const provided = await provider.provider(requires) as T;

    this.providerCaches.set(provider.provideTo, provided);

    this.eventTarget?.dispatchEvent(new CustomEvent("provided", {
      detail: {
        provider, provided
      }
    }));

    return provided;
  }
}

export class ErrorProviderNotFound extends Error {
  constructor() {
    super("Provider not found.");
  }
}

export class ErrorMultipleProviderLoadedForUniqueSymbol extends Error {
  constructor(public provider: Provider<unknown>) {
    super("Multiple providers were loaded for a unique symbol.");
  }
}

export class ErrorProviderStructureValidationFailed extends Error {
  constructor(public errors: Map<TypeSymbol<unknown>, unknown[]>) {
    super("Validate failed.");
  }
}
