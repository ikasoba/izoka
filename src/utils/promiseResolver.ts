export function promiseWithResolvers<T>() {
  const res = {} as { promise: Promise<T>; resolve: (val: T) => void; reject: (err?: unknown) => void; };

  res.promise = new Promise<T>((resolve, reject) => {
    res.resolve = resolve;
    res.reject = reject;
  });

  return res;
}
