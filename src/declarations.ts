import { styleFamily } from "./globals";
import type { ConfigReducerState } from "./reducers/config";
import type { InlineStyle, RenderGuard, StyleRule } from "./types";
import { Effect } from "./utils/observable";

type A = DeclarationStore;

type C = {
  [K in keyof DeclarationStore]: DeclarationStore[K];
};

export class DeclarationStore extends Effect {
  epoch = 0;
  normal?: StyleRule[];
  important?: StyleRule[];
  guards?: RenderGuard[];

  constructor(
    state: ConfigReducerState,
    props: Record<string, any>,
    public run: () => void,
  ) {
    super(run);
    this.update(state, props);
  }

  update(state: ConfigReducerState, props: Record<string, any>) {
    this.cleanup();

    if (this.epoch > 0) {
      this.cleanup();
    }

    const source = props[state.config.source] as string;

    // TODO: Bail early if nothings has changed
    const normal: StyleRule[] = [];
    const important: StyleRule[] = [];
    const guards: RenderGuard[] = [
      { type: "prop", name: state.config.source, value: source },
    ];

    for (const className of source.split(/\s+/)) {
      const styleRuleSet = this.get(styleFamily(className));
      if (!styleRuleSet) {
        continue;
      }

      collectDefinitions(styleRuleSet.n, normal);
      collectDefinitions(styleRuleSet.i, important);
    }

    this.epoch++;
    this.normal = normal;
    this.important = important;
    this.guards = guards;

    return state;
  }

  cleanup() {
    super.cleanup();
    this.normal = undefined;
    this.important = undefined;
    this.guards = undefined;
  }
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
