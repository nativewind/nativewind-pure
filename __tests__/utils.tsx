import type { PropsWithChildren } from "react";
import {
  ContainerContext,
  styleFamily,
  UniversalVariableContext,
  VariableContext,
  type ConfigReducerState,
  type ConfigStates,
  type ContainerContextValue,
  type InteropReducerState,
  type StyleDeclaration,
  type StyleRule,
  type StyleRuleSet,
  type VariableContextValue,
} from "../src";
import type { DeclarationStore } from "../src/declarations";
import type { Styles } from "../src/styles";
import { observable } from "../src/utils/observable";

jest.mock("react-native", () => {
  return {
    Dimensions: {
      get: jest.fn(),
    },
    Appearance: {
      getColorScheme: jest.fn(),
    },
  };
});

export function addStyle(className: string, ruleSet: StyleRuleSet): void;
export function addStyle(className: string, rule: StyleRule): void;
export function addStyle(className: string, rule: StyleRule[]): void;
export function addStyle(
  className: string,
  normalDeclarations: StyleDeclaration[],
): void;
export function addStyle(
  className: string,
  value: StyleRuleSet | StyleRule | StyleRule[] | StyleDeclaration[],
): void {
  if (Array.isArray(value)) {
    if (isStyleRuleArray(value)) {
      styleFamily.set(className, observable({ n: value }));
    } else {
      styleFamily.set(className, observable({ n: [{ s: [0], d: value }] }));
    }
  } else if ("s" in value) {
    styleFamily.set(className, observable({ n: [value] }));
  } else {
    styleFamily.set(className, observable(value));
  }
}

function isStyleRuleArray(
  value: StyleRule[] | StyleDeclaration[],
): value is StyleRule[] {
  return "s" in value[0];
}

type RenderHookProps = PropsWithChildren<{
  props: Record<string, any>;
  inheritedVariables?: VariableContextValue;
  universalVariables?: VariableContextValue;
  containers?: ContainerContextValue;
}>;

export function wrapper({
  children,
  inheritedVariables = {},
  universalVariables = {},
  containers = {},
}: RenderHookProps) {
  return (
    <UniversalVariableContext.Provider value={universalVariables}>
      <VariableContext.Provider value={inheritedVariables}>
        <ContainerContext.Provider value={containers}>
          {children}
        </ContainerContext.Provider>
      </VariableContext.Provider>
    </UniversalVariableContext.Provider>
  );
}

export function stripUndefined(obj: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(obj).flatMap(([key, value]) => {
      return value === undefined ? [] : [[key, value]];
    }),
  );
}

type ConfigReducerStateWithoutClasses = Omit<
  ConfigReducerState,
  "declarations" | "styles"
> & {
  styles?: { [key in keyof Styles]?: Styles[key] };
  declarations?: {
    [key in keyof DeclarationStore]?: DeclarationStore[key];
  };
};

/**
 * The InteropReducerState is a complex object with many optional/internal properties.
 * This helper function will strip out any undefined values and preserve the internal
 * structures for easier testing.
 * @param result
 * @param partial
 * @param configPartials
 * @returns
 */
export function resultHelper(
  result: InteropReducerState,
  partial: Partial<InteropReducerState>,
  ...configPartials: Partial<ConfigReducerStateWithoutClasses>[]
) {
  if (configPartials.length) {
    const configStates = Object.fromEntries(
      Object.entries(result.configStates).map(([key, value], index) => {
        const { styles, declarations, ...partial } = configPartials[index];
        const config = { ...value, ...partial };

        if (declarations && config.declarations) {
          config.declarations = { ...config.declarations, ...declarations };
        }

        if (styles && config.styles) {
          config.styles = { ...config.styles, ...styles };
        }

        return [key, config];
      }),
    );

    return {
      ...stripUndefined(result),
      configStates,
      ...partial,
    };
  }

  return {
    ...stripUndefined(result),
    ...partial,
  };
}
