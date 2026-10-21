const nativeValue = () => Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!;

/**
 * Sets an input's value the way typing does, so React's onChange (and
 * react-hook-form's) fires for a value picked from a Polaris list.
 */
export function writeValue(el: HTMLInputElement, value: string) {
  if (el.value === value) return;
  nativeValue().set!.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Calls `onSet` whenever code — React, or react-hook-form's reset()/setValue() — assigns the value. */
export function watchValue(el: HTMLInputElement, onSet: (value: string) => void) {
  const own = Object.getOwnPropertyDescriptor(el, "value");
  const base = own ?? nativeValue();
  Object.defineProperty(el, "value", {
    configurable: true,
    enumerable: base.enumerable,
    get() {
      return base.get!.call(this);
    },
    set(v: string) {
      base.set!.call(this, v);
      onSet(base.get!.call(this));
    },
  });
  return () => {
    if (own) Object.defineProperty(el, "value", own);
    else delete (el as { value?: string }).value;
  };
}
