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
      if (!init) {
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
    batch(batch, ...args: [Value] | Args) {
      value =
        typeof write === "function"
          ? write((observable, ...args) => {
              return observable.batch(batch, ...args);
            }, ...(args as Args))
          : (args[0] as Value);

      for (const effect of effects) {
        batch.add(effect);
      }
    },
  };
}

export class Effect {
  constructor(public run: () => void) {}
  public dependencies = new Set<() => void>();

  cleanup() {
    for (const dep of this.dependencies) {
      dep();
    }
    this.dependencies.clear();
  }
  get<Value, Args extends unknown[]>(
    observableOrValue: Observable<Value, Args> | Value
  ) {
    /**
     * In production, things like StyleRuleSets will be static and not observable.
     */
    return typeof observableOrValue === "object" &&
      observableOrValue &&
      "get" in observableOrValue
      ? observableOrValue.get(this)
      : observableOrValue;
  }
}

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

export function weakFamily<Key extends object, Result>(
  fn: (key: Key) => Result
) {
  const map = new WeakMap<object, Result>();
  return Object.assign(map, (key: Key) => {
    let value = map.get(key);
    if (!value) {
      value = fn(key);
      map.set(key, value);
    }
    return value;
  });
}
