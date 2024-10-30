import { styleFamily } from "./globals";
import type { ConfigReducerState } from "./reducers/config";
import type { RenderGuard, StyleRule } from "./types";
import { Effect } from "./utils/observable";

export type DeclarationStore = {
  epoch: number;
  normal?: StyleRule[];
  important?: StyleRule[];
  guards?: RenderGuard[];
  update(
    state: ConfigReducerState,
    props: Record<string, any>,
  ): ConfigReducerState;
  cleanup(): void;
};

export function buildDeclarationStore(
  state: ConfigReducerState,
  props: Record<string, any>,
  run: () => void,
) {
  const effect = new Effect(run);

  const store: DeclarationStore = {
    epoch: 0,
    update(state, props) {
      store.cleanup();

      if (store.epoch > 0) {
        store.cleanup();
      }

      const source = props[state.config.source] as string;

      // TODO: Bail early if nothings has changed
      const normal: StyleRule[] = [];
      const important: StyleRule[] = [];
      const guards: RenderGuard[] = [
        { type: "prop", name: state.config.source, value: source },
      ];

      for (const className of source.split(/\s+/)) {
        const styleRuleSet = effect.get(styleFamily(className));
        if (!styleRuleSet) {
          continue;
        }

        collectDefinitions(styleRuleSet.n, normal);
        collectDefinitions(styleRuleSet.i, important);
      }

      store.epoch++;
      store.normal = normal;
      store.important = important;
      store.guards = guards;

      return state;
    },
    cleanup() {
      effect.cleanup();
      store.normal = undefined;
      store.important = undefined;
      store.guards = undefined;
    },
  };

  store.update(state, props);

  return store;
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
) {
  if (!styleRules) return;
  for (const styleRule of styleRules) {
    collection.push(styleRule);
  }
}

/**
 * https://drafts.csswg.org/selectors/#specificity-rules
 *
 * This is a holey array. See SpecificityIndex to know what each index represents.
 */
export type Specificity = SpecificityValue[];
export type SpecificityValue = number | undefined;

export const SpecificityIndex = {
  Order: 0,
  ClassName: 1,
  Important: 2,
  Inline: 3,
  PseudoElements: 4,
  // Id: 0, - We don't support ID yet
  // StyleSheet: 0, - We don't support multiple stylesheets
};
