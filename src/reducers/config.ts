import type { Dispatch } from "react";
import type { ContainerContextValue, VariableContextValue } from "../contexts";
import { buildDeclarationStore, type DeclarationStore } from "../declarations";
import type { InteropReducerAction } from "../reducers/component";
import { buildStyleStore, type StyleStore } from "../styles";
import type {
  ConfigWithKey,
  InlineStyle,
  SideEffectTrigger,
  StyleValueDescriptor,
} from "../types";

export type ConfigReducerState = Readonly<{
  // The key of the config, used to group props, variables, containers, etc.
  key: string;
  // The config that this state is for
  config: ConfigWithKey;
  source?: string | null | undefined;
  target?: Record<string, unknown> | null | undefined;

  declarations?: DeclarationStore;
  styles?: StyleStore;

  // The props produced by the config
  props?: Record<string, unknown>;
  // The variables produced by the config
  variables?: Record<string, StyleValueDescriptor>;
  // The containers produced by the config
  containers?: Record<string, unknown>;
  // The side effects produced by the config
  sideEffects?: SideEffectTrigger[];
  // The hover actions produced by the config
  hoverActions?: ConfigReducerAction[];
  // The active actions produced by the config
  activeActions?: ConfigReducerAction[];
  // The focus actions produced by the config
  focusActions?: ConfigReducerAction[];
}>;

export type ConfigReducerAction = Readonly<
  { type: "update-styles" } | { type: "update-definitions" }
>;

export function configReducer(
  state: ConfigReducerState,
  action: ConfigReducerAction,
  dispatch: Dispatch<InteropReducerAction>,
  incomingProps: Record<string, unknown>,
  inheritedVariables: VariableContextValue,
  universalVariables: VariableContextValue,
  inheritedContainers: ContainerContextValue,
) {
  switch (action.type) {
    case "update-definitions": {
      const nextState = updateDefinitions(state, dispatch, incomingProps);
      return Object.is(state, nextState)
        ? state
        : updateStyles(
            nextState,
            incomingProps,
            inheritedVariables,
            universalVariables,
            inheritedContainers,
          );
    }
    case "update-styles": {
      return updateStyles(
        state,
        incomingProps,
        inheritedVariables,
        universalVariables,
        inheritedContainers,
      );
    }
    default: {
      action satisfies never;
      return state;
    }
  }
}

function updateDefinitions(
  state: ConfigReducerState,
  dispatch: Dispatch<InteropReducerAction>,
  props: Record<string, unknown>,
): ConfigReducerState {
  const source = props[state.config.source] as string;
  const target = props[state.config.target] as InlineStyle;

  // Has this component ever seen styles?
  const initialized = state.declarations;

  // Is there anything to do?
  if (!initialized && !source && !target) {
    return state;
  }

  if (!state.declarations) {
    return {
      ...state,
      declarations: buildDeclarationStore(state, props, () => {
        dispatch({
          type: "perform-config-reducer-actions",
          actions: [{ action: { type: "update-definitions" }, key: state.key }],
        });
      }),
      styles: buildStyleStore(() => {
        dispatch({
          type: "perform-config-reducer-actions",
          actions: [{ action: { type: "update-styles" }, key: state.key }],
        });
      }),
    };
  }

  return state.declarations.update(state, props);
}

function updateStyles(
  state: ConfigReducerState,
  incomingProps: Record<string, unknown>,
  inheritedVariables: VariableContextValue,
  universalVariables: VariableContextValue,
  inheritedContainers: ContainerContextValue,
) {
  if (!state.styles) {
    return state;
  }

  /**
   * Currently the styles will always be updated, but in the future we can
   * optimize this to only update when the props have changed.
   */
  const props = state.styles.update(
    state,
    incomingProps,
    inheritedVariables,
    universalVariables,
    inheritedContainers,
  );

  return { ...state, props };
}
