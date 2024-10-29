import type { ConfigReducerState } from "../configReducer";

export type * from "./animation";
export type * from "./conditions";
export type * from "./container";
export type * from "./styles";

export type Maybe<T> = T | undefined;
export type Writeable<T> = { -readonly [P in keyof T]: T[P] };

// The options passed to cssInterop
export type Config = { target: string; source: string };
// cssInterop will add a key to the config
export type ConfigWithKey = Config & { key: string };

// The results of the config reducers grouped by their key
export type ConfigStates = {
  [key: ConfigWithKey["key"]]: ConfigReducerState;
};

export type Callback = () => void;

// Side effects are things that cannot be performed during a render. They will be invoked during an useEffect
export type SideEffectTrigger = Callback;
