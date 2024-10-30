import { styleFamily } from "./globals";
import type { ConfigReducerState } from "./reducers/config";
import type { RenderGuard, StyleRule } from "./types";
import type { Effect, Mutable, Observable } from "./utils/observable";

export type Declarations = Effect & {
  epoch: number;
  normal: StyleRule[];
  important: StyleRule[];
  guards: RenderGuard[];
};

export function buildDeclarations(
  state: ConfigReducerState,
  props: Record<string, any>,
  run: () => void,
): Declarations {
  let didUpdate = false;
  const previous = state.declarations;
  const source = props[state.config.source] as string;

  const next: Declarations = {
    epoch: previous ? previous.epoch : 0,
    normal: [],
    important: [],
    guards: [{ type: "prop", name: state.config.source, value: source }],
    run,
    dependencies: new Set(),
    get(readable) {
      return readable.get(next);
    },
  };

  for (const className of source.split(/\s+/)) {
    const styleRuleSet = next.get(styleFamily(className));
    if (!styleRuleSet) {
      continue;
    }

    didUpdate ||= collectDefinitions(
      styleRuleSet.n,
      next.normal,
      previous?.normal,
    );
    didUpdate ||= collectDefinitions(
      styleRuleSet.i,
      next.important,
      previous?.important,
    );
  }

  if (didUpdate) {
    next.epoch++;
  }

  return next;
}

/**
 * Mutates the collection with valid style rules
 * @param styleRules
 * @param collection
 * @returns
 */
function collectDefinitions(
  styleRules: StyleRule[] | undefined,
  collection: StyleRule[],
  previous?: StyleRule[],
) {
  if (!styleRules) return previous !== undefined;

  for (const styleRule of styleRules) {
    collection.push(styleRule);
  }

  return true;
}
