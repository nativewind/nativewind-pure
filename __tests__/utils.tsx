import type { PropsWithChildren } from "react";
import {
  animationFamily,
  ContainerContext,
  styleFamily,
  UniversalVariableContext,
  VariableContext,
  type ComponentReducerState,
  type ConfigReducerState,
  type ContainerContextValue,
  type RawAnimation,
  type StyleDeclaration,
  type StyleRule,
  type StyleRuleSet,
  type VariableContextValue,
} from "../src";
import type { Declarations } from "../src/declarations";
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
export function addStyle(
  className: string,
  normalDeclarations: StyleDeclaration[] | StyleRule[],
): void;
export function addStyle(
  className: string,
  value: StyleRuleSet | StyleRule | StyleRule[] | StyleDeclaration[],
): void {
  if (Array.isArray(value)) {
    if (isStyleRuleArray(value)) {
      styleFamily(className).set({ n: value });
    } else {
      styleFamily(className).set({ n: [{ s: [0], d: value }] });
    }
  } else if ("s" in value) {
    styleFamily(className).set({ n: [value] });
  } else {
    styleFamily(className).set(value);
  }
}

export function addKeyFrames(name: string, keyframes: RawAnimation): void {
  animationFamily(name).set(keyframes);
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
    [key in keyof Declarations]?: Declarations[key];
  };
};

/**
 * The ComponentReducerState is a complex object with many optional/internal properties.
 * This helper function will strip out any undefined values and preserve the internal
 * structures for easier testing.
 * @param result
 * @param partial
 * @param configPartials
 * @returns
 */
export function resultHelper(
  result: ComponentReducerState,
  partial: Partial<ComponentReducerState>,
  ...configPartials: Partial<ConfigReducerStateWithoutClasses>[]
) {
  if (configPartials.length) {
    const configStates = Object.fromEntries(
      Object.entries(result.configStates).map(([key, value], index) => {
        const { styles, declarations, ...partial } = configPartials[index];
        const config = { ...value, ...partial };

        if (declarations && config.declarations) {
          config.declarations = {
            ...config.declarations,
            ...declarations,
          } as Declarations;
        }

        if (styles && config.styles) {
          config.styles = { ...config.styles, ...styles } as Styles;
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
