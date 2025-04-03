import { symbolOf, Injectable, Inject, defineProvider, IzokaModule } from "@ikasoba000/izoka";
import { describe, expect, test } from "vitest";

test("module", async () => {
  interface IHandler {
    handle(req: string): string;
  }

  const IHandler = symbolOf<IHandler>({
    name: "IHandler",
    isUnique: false
  });

  @Injectable(IHandler)
  class HelloHandler implements IHandler {
    handle(req: string): string {
      return `Hello, ${req}!`
    }
  }

  const HelloModule = IzokaModule.from({
    imports: [],
    providers: [HelloHandler],
    exports: [HelloHandler],
  })

  const FooHandler = defineProvider(IHandler, [], () => ({
    handle(req) {
      return "bar";
    },
  }));

  const FooModule = IzokaModule.from({
    imports: [],
    providers: [FooHandler],
    exports: [FooHandler]
  })

  @Injectable()
  class App {
    constructor(
      @Inject(IHandler)
      public handlers: IHandler[]
    ) { }
  }

  const AppModule = IzokaModule.from({
    imports: [HelloModule, FooModule],
    providers: [App],
    exports: [App]
  })

  const app = (await AppModule.get(App)) as App;

  expect(app).instanceof(App);
  expect(app.handlers.length).toEqual(2);
  expect(app.handlers[0].handle("world")).toEqual("Hello, world!");
  expect(app.handlers[1].handle("")).toEqual("bar");
})
