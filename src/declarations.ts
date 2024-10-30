import type { makeMutable } from "react-native-reanimated";
import { animationSideEffects } from "./animations";
import { styleFamily } from "./globals";
import type { ConfigReducerState } from "./reducers/config";
import type {
  AnimationProperties,
  RenderGuard,
  SideEffectTrigger,
  StyleRule,
} from "./types";
import type { Effect } from "./utils/observable";

type ReanimatedMutable = ReturnType<typeof makeMutable<number>>;

export type Declarations = Effect & {
  epoch: number;
  normal: StyleRule[];
  important: StyleRule[];
  guards: RenderGuard[];
  animationProperties: AnimationProperties[];
  animation?: AnimationProperties;
  sharedValues?: Record<string, ReanimatedMutable>;
  sideEffects?: SideEffectTrigger[];
};

type Updates = {
  rules?: boolean;
  animation?: boolean;
};

export function buildDeclarations(
  state: ConfigReducerState,
  props: Record<string, any>,
  run: () => void,
): Declarations {
  const previous = state.declarations;
  const source = props[state.config.source] as string;

  const next: Declarations = {
    epoch: previous ? previous.epoch : 0,
    normal: [],
    important: [],
    animationProperties: [],
    guards: [{ type: "prop", name: state.config.source, value: source }],
    run,
    dependencies: new Set(),
    get(readable) {
      return readable.get(next);
    },
  };

  let updates: Updates = {};

  for (const className of source.split(/\s+/)) {
    const styleRuleSet = next.get(styleFamily(className));
    if (!styleRuleSet) {
      continue;
    }

    updates = collectRules(
      updates,
      styleRuleSet.n,
      next,
      previous,
      next.normal,
      previous?.normal,
    );
    updates = collectRules(
      updates,
      styleRuleSet.i,
      next,
      previous,
      next.important,
      previous?.important,
    );
  }

  if (updates.rules || updates.animation) {
    next.epoch++;
    if (updates.animation) {
      // This will mutate next with the side effects
      animationSideEffects(next);
    }
  }

  return next;
}

/**
 * Mutates the collection with valid style rules
 * @param styleRules
 * @param collection
 * @returns
 */
function collectRules(
  updates: Updates,
  styleRules: StyleRule[] | undefined,
  next: Declarations,
  previous: Declarations | undefined,
  collection: StyleRule[],
  previousCollection?: StyleRule[],
) {
  if (!styleRules) {
    updates.rules ||= previousCollection !== undefined;
    return updates;
  }

  let collectionIndex = Math.max(0, collection.length - 1);
  let aIndex = Math.max(0, next.animationProperties.length - 1);

  for (const rule of styleRules) {
    if (!testRule(rule)) continue;

    if (rule.a) {
      next.animationProperties.push(rule.a);
      // Changing any animation property will restart all animations
      updates.animation ||= Object.is(
        previous?.animationProperties[aIndex],
        rule.a,
      );
      aIndex++;
    }

    collection.push(rule);
    updates.rules ||= Object.is(previousCollection?.[collectionIndex], rule);
    collectionIndex++;
  }

  return updates;
}

function testRule(styleRule: StyleRule) {
  return true;
}
