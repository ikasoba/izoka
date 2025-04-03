import { symbolOf, DependencyInjectorContext, Injectable, Inject, defineProvider } from "@ikasoba000/izoka";
import { describe, expect, test } from "vitest";

test("injector", async () => {
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

  const FooHandler = defineProvider(IHandler, [], () => ({
    handle(req) {
      return "bar";
    },
  }));

  @Injectable()
  class App {
    constructor(
      @Inject(IHandler)
      public handlers: IHandler[]
    ) { }
  }

  const injector = DependencyInjectorContext.from([
    App,
    HelloHandler,
    FooHandler
  ])

  const app = (await injector.get(App)) as App;

  expect(app).instanceof(App);
  expect(app.handlers.length).toEqual(2);
  expect(app.handlers[0].handle("world")).toEqual("Hello, world!")
  expect(app.handlers[1].handle("")).toEqual("bar")
});
