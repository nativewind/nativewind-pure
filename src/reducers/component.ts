import type { ComponentType, Dispatch, Reducer } from "react";
import type { ContainerContextValue, VariableContextValue } from "../contexts";
import type { ConfigStates, Maybe, SideEffectTrigger } from "../types";
import type { ConfigReducerAction, ConfigReducerState } from "./config";
import { updateRenderTree } from "../rendering";
import { configReducer } from "./config";

export type InteropReducerState = Readonly<{
  key: object;
  dispatch: Dispatch<InteropReducerAction>;
  // The type this component will render as
  type: ComponentType;
  // The base component type
  baseType: ComponentType;
  // The results of the config reducers grouped by their key
  configStates: Readonly<ConfigStates>;
  // The flattened version of groupedProps
  props?: Record<string, unknown>;
  // The side effects for each config, grouped by config key
  sideEffects?: Record<string, SideEffectTrigger[] | undefined>;
  // The variables for each config, grouped by config key
  variables?: VariableContextValue;
  // The containers for each config, grouped by config key
  containers?: ContainerContextValue;
  // The hover actions for each config, grouped by config key
  hoverActions?: Record<string, ConfigReducerAction[] | undefined>;
  // The active actions for each config, grouped by config key
  activeActions?: Record<string, ConfigReducerAction[] | undefined>;
  // The focus actions for each config, grouped by config key
  focusActions?: Record<string, ConfigReducerAction[] | undefined>;
}>;

export type InteropReducerAction =
  Readonly<// Perform actions on the configReducer
  {
    type: "perform-config-reducer-actions";
    actions: PerformConfigReducerAction[];
  }>;

export type PerformConfigReducerAction = Readonly<{
  action: ConfigReducerAction;
  key: string;
}>;

export type PerformConfigReducerAction_old = Readonly<{
  action: ConfigReducerAction;
  state: ConfigReducerState;
}>;

export type InteropReducer = Reducer<InteropReducerState, InteropReducerAction>;

export function buildInteropReducer(
  incomingProps: Record<string, unknown>,
  inheritedVariables: VariableContextValue,
  universalVariables: VariableContextValue,
  inheritedContainers: ContainerContextValue,
): InteropReducer {
  return (state, action) => {
    switch (action.type) {
      case "perform-config-reducer-actions": {
        return performConfigReducerActions(
          state,
          action.actions,
          incomingProps,
          inheritedVariables,
          universalVariables,
          inheritedContainers,
        );
      }
    }
  };
}

export function initInteropReducer(
  dispatch: Dispatch<InteropReducerAction>,
  type: ComponentType,
  state: Partial<InteropReducerState>,
  actions: Readonly<PerformConfigReducerAction[]>,
  incomingProps: Record<string, unknown>,
  inheritedVariables: VariableContextValue,
  universalVariables: VariableContextValue,
  inheritedContainers: ContainerContextValue,
): InteropReducerState {
  return Object.assign(
    { key: {}, type, baseType: type, dispatch },
    performConfigReducerActions(
      state as InteropReducerState,
      actions,
      incomingProps,
      inheritedVariables,
      universalVariables,
      inheritedContainers,
    ),
  );
}

export function performConfigReducerActions(
  state: InteropReducerState,
  actions: Readonly<PerformConfigReducerAction[]>,
  incomingProps: Record<string, unknown>,
  inheritedVariables: VariableContextValue,
  universalVariables: VariableContextValue,
  inheritedContainers: ContainerContextValue,
): InteropReducerState {
  let updatedStates: Maybe<ConfigStates>;
  let nextVariables: Maybe<VariableContextValue>;
  let nextContainers: Maybe<ContainerContextValue>;
  let nextGroupedProps: Maybe<Record<string, Maybe<Record<string, unknown>>>>;
  let nextSideEffects: Maybe<Record<string, Maybe<SideEffectTrigger[]>>>;
  let nextHoverActions: Maybe<Record<string, Maybe<ConfigReducerAction[]>>>;
  let nextActiveActions: Maybe<Record<string, Maybe<ConfigReducerAction[]>>>;
  let nextFocusActions: Maybe<Record<string, Maybe<ConfigReducerAction[]>>>;

  /**
   * This reducer's state is used as the props for multiple components/hooks.
   * So we need to preserve the value if it didn't change.
   *
   * For example, setting a new variable shouldn't change the container attribute.
   */
  for (const { key, action } of actions) {
    const configState = state.configStates[key];
    const nextConfigState = configReducer(
      configState,
      action,
      state.dispatch,
      incomingProps,
      inheritedVariables,
      universalVariables,
      inheritedContainers,
    );

    /**
     * If the config state didn't change, we can skip updating the state.
     *
     * However, variables, containers, and side-effects are special cases where the order matters.
     * If a prior config state set new values, we need to maintain the order by still applying the later ones
     */
    if (Object.is(configState, nextConfigState)) {
      if (nextVariables) Object.assign(nextVariables, configState.variables);
      if (nextContainers) Object.assign(nextContainers, configState.containers);
      continue;
    }

    // Something caused the config state to change, find out what it was

    // Update the state with the new config state
    updatedStates ??= {};
    updatedStates[nextConfigState.key] = nextConfigState;

    // Did the props change?
    if (!Object.is(configState.props, nextConfigState.props)) {
      nextGroupedProps ??= {};
      nextGroupedProps[nextConfigState.key] = nextConfigState.props;
    }

    // Did a variable change?
    if (!Object.is(configState.variables, nextConfigState.variables)) {
      nextVariables ??= {};
      Object.assign(nextVariables, nextConfigState.variables);
    }

    // Did a container change?
    if (!Object.is(configState.containers, nextConfigState.containers)) {
      nextContainers ??= { ...inheritedContainers };
      Object.assign(nextContainers, nextConfigState.containers);
    }

    // Did side effects change?
    if (!Object.is(configState.sideEffects, nextConfigState.sideEffects)) {
      nextSideEffects ??= {};
      nextSideEffects[nextConfigState.key] = nextConfigState.sideEffects;
    }

    // Did hover actions change?
    if (!Object.is(configState.hoverActions, nextConfigState.hoverActions)) {
      nextHoverActions ??= {};
      nextHoverActions[nextConfigState.key] = nextHoverActions.hoverActions;
    }

    // Did active actions change?
    if (!Object.is(configState.activeActions, nextConfigState.activeActions)) {
      nextActiveActions ??= {};
      nextActiveActions[nextConfigState.key] = nextActiveActions.activeActions;
    }

    // Did focus actions change?
    if (!Object.is(configState.focusActions, nextConfigState.focusActions)) {
      nextFocusActions ??= {};
      nextFocusActions[nextConfigState.key] = nextFocusActions.focusActions;
    }
  }

  // Did anything change?
  if (!updatedStates) {
    return state;
  }

  // Update the render tree, this will inject the context providers / animated types
  return updateRenderTree(
    state,
    Object.assign({}, state.configStates, updatedStates),
    nextVariables ?? state.variables,
    nextContainers ?? state.containers,
    nextSideEffects ?? state.sideEffects,
    nextHoverActions ?? state.hoverActions,
    nextActiveActions ?? state.activeActions,
    nextFocusActions ?? state.focusActions,
  );
}