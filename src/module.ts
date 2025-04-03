import { createProvider, defineProvider } from "./decorator.js";
import { DependencyInjectorContext, ErrorProviderNotFound } from "./injector.js";
import { decorateProviderOf, Providable, Provider } from "./provider.js";
import { getSymbolOf, symbolOf, TypeSymbol, TypeSymbolable, typeSymbolableToString } from "./symbol.js";
import { CustomEventTarget } from "./utils/CustomEventTarget.js";

export interface IModule {
  getExportedProviders(): Providable<unknown>[];
}

export interface IzokaModuleOptions {
  imports: IModule[];
  providers: Providable<unknown>[];
  exports: (Providable<unknown> | TypeSymbolable<unknown>)[];
}

export class IzokaModule extends CustomEventTarget<{
  provided: CustomEvent<{
    provider: Provider<unknown>;
    provided: unknown;
  }>
}> {
  private constructor(
    private ctx: DependencyInjectorContext,
    private exporteds: Set<Provider<unknown>>,
    private providerCaches = new Map<TypeSymbol<unknown>, unknown>()
  ) {
    super();
  }

  static from({ imports, providers, exports }: IzokaModuleOptions): IzokaModule {
    const injectors: DependencyInjectorContext["injectors"] = new Map();
    const exporteds = new Set<Provider<unknown>>();

    const process = (p: Providable<unknown>) => {
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

    for (const m of imports) {
      for (const p of m.getExportedProviders()) {
        process(p)
      }
    }

    for (const p of providers) {
      process(p)
    }

    for (const p of exports) {
      if (typeof p == "function") {
        const provider = createProvider(p);

        exporteds.add(provider);
      } else if ("provideTo" in p) {
        exporteds.add(p);
      } else {
        const provider = injectors.get(p) ?? [];

        for (const p of provider) {
          exporteds.add(p)
        }
      }
    }

    const injector = new DependencyInjectorContext(injectors);

    const m = new IzokaModule(
      injector,
      exporteds,
    )

    injector.eventTarget = m;

    return m;
  }

  async get<T>(id: TypeSymbolable<T>): Promise<T | T[]> {
    return this.ctx.get(id);
  }

  private async resolveAndProvide<T>(provider: Provider<T>): Promise<T> {
    const requires = [];
    for (const req of provider.requires) {
      requires.push(await this.ctx.get(req))
    }

    const provided = await provider.provider(requires) as T;

    this.providerCaches.set(provider.provideTo, provided);

    this.dispatchEvent(new CustomEvent("provided", {
      detail: { provider, provided }
    }));

    return provided;
  }

  private _exportedsCache?: Providable<unknown>[];
  getExportedProviders() {
    if (this._exportedsCache) return this._exportedsCache;

    const providers: Providable<unknown>[] = [];

    for (const p of this.exporteds) {
      providers.push(
        defineProvider(p.provideTo, [], () => this.resolveAndProvide(p))
      );
    }

    this._exportedsCache = providers;

    return providers;
  }
}
