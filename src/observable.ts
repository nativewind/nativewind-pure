export type Observable<Value, Args extends unknown[]> = {
  // Used for debugging only
  name?: string;
  // Get the current value of the observable. If you provide an Effect, it will be subscribed to the observable.
  get(effect?: Effect): Value;
  // Set the value and rerun all subscribed Effects
  set(...value: Args): void;
  // Set, but add the effects to a batch to be run later
  batch(batch: Set<Effect>, ...value: Args): void;
};

type Read<Value> = (get: Getter) => Value;
type Write<Value, Args extends unknown[]> = (
  set: Setter,
  ...args: Args
) => Value;
type Getter = <Value, Args extends unknown[]>(
  observable: Observable<Value, Args>
) => Value;
type Setter = <Value, Args extends unknown[]>(
  observable: Observable<Value, Args>,
  ...args: Args
) => void;

export function observable<Value, Args extends unknown[]>(
  read: Value | Read<Value>,
  write: Write<Value, Args>
): Observable<Value, Args>;
export function observable<Value>(
  read: Value | Read<Value>
): Observable<Value, [Value]>;
export function observable<Value>(): Observable<
  Value | undefined,
  [Value | undefined]
>;
export function observable<Value, Args extends unknown[]>(
  read?: Value | Read<Value>,
  write?: Write<Value, Args>
): Observable<Value, Args> {
  const effects = new Set<Effect>();

  let value: Value | undefined;
  let init = false;

  const isReadOnly = typeof read === "function" && !write;

  return {
    get(effect) {
      /**
       * Observables with read functions are lazy and only run the read function once.
       *
       * We also need to re-run the read function if this is a new effect
       * to ensure that the effect is subscribed to this observable's dependents.
       */
      if (!init || (effect && !effects.has(effect))) {
        init = true;
        value =
          typeof read === "function"
            ? (read as Read<Value>)((observable) => observable.get(effect))
            : read;
      }

      /**
       * Subscribe the effect to the observable if it is not read-only.
       */
      if (effect && !isReadOnly) {
        effects.add(effect);
        effect.dependencies.add(() => effects.delete(effect));
      }

      return value as Value;
    },
    /**
     * Sets the value of the observable and immediately runs all subscribed effects.
     * If you are setting multiple observables in succession, use batch() instead.
     */
    set(...args: [Value] | Args) {
      value =
        typeof write === "function"
          ? write((observable, ...args) => {
              return observable.set(...args);
            }, ...(args as Args))
          : (args[0] as Value);

      for (const effect of effects) {
        effect.run();
      }
    },
    /**
     * batch() accepts a Set<Effect> and instead of running the effects immediately,
     * it will add them to the Set.
     *
     * It it up to the caller to run the effects in the Set.
     */
    batch(batch, ...args: [Value] | Args) {
      value =
        typeof write === "function"
          ? write((observable, ...args) => {
              return observable.batch(batch, ...args);
            }, ...(args as Args))
          : (args[1] as Value);

      for (const effect of effects) {
        batch.add(effect);
      }
    },
  };
}

/**
 * A non-observable object that can be mutated.
 * In production, we don't need observability for everything,
 * so we can this to avoid the overhead of observability.
 */
export type Mutable<Value> = {
  get(): Value;
  set(value: Value): void;
};

export function mutable<Value>(): Mutable<Value | undefined>;
export function mutable<Value>(value?: Value): Mutable<Value> {
  return {
    get() {
      return value as Value;
    },
    set(newValue: Value) {
      value = newValue;
    },
  };
}

/**
 * An effect can be used to subscribe to an observable. When the observable
 * changes, the effect will run.
 */
export class Effect {
  constructor(public run: () => void) {}
  public dependencies = new Set<() => void>();

  get<Value, Args extends unknown[]>(
    readable: Observable<Value, Args> | Mutable<Value>
  ) {
    return readable.get(this);
  }

  cleanup() {
    for (const dep of this.dependencies) {
      dep();
    }
    this.dependencies.clear();
  }
}

/**
 * Utility around Map that creates a new value if it doesn't exist.
 */
export function family<Value>(fn: (name: string) => Value) {
  const map = new Map<string, Value>();
  return Object.assign(map, (name: string) => {
    let result = map.get(name);
    if (!result) {
      result = fn(name);
      map.set(name, result);
    }
    return result;
  });
}

/**
 * Utility around WeakMap that creates a new value if it doesn't exist.
 */
export function weakFamily<Key extends WeakKey, Result>(
  fn: (key: Key) => Result
) {
  const map = new WeakMap<Key, Result>();
  return Object.assign(map, (key: Key) => {
    let value = map.get(key);
    if (!value) {
      value = fn(key);
      map.set(key, value);
    }
    return value;
  });
}
