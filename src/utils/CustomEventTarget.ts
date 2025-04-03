type CustomEventListener<E extends Event> =
  | ((evt: E) => void)
  | { handleEvent(object: E): void }
  ;

export class CustomEventTarget<EventMap extends { [type: string]: Event }> extends EventTarget {
  addEventListener<K extends keyof EventMap>(type: K, callback: CustomEventListener<EventMap[K]> | null, options?: AddEventListenerOptions | boolean): void;
  addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean) {
    return super.addEventListener(type, callback, options);
  }
  
  dispatchEvent(event: EventMap[keyof EventMap]): boolean;
  dispatchEvent(event: Event): boolean {
    return super.dispatchEvent(event);
  }
  
  removeEventListener<K extends keyof EventMap>(type: K, callback: CustomEventListener<EventMap[K]> | null, options?: EventListenerOptions | boolean): void;
  removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean): void {
    return super.removeEventListener(type, callback, options);
  }
}
