import type { ComponentReducerState } from "./reducers/component";

export function updateRenderTree(
  previousState: ComponentReducerState,
  configStates: ComponentReducerState["configStates"],
  variables: ComponentReducerState["variables"],
  containers: ComponentReducerState["containers"],
  sideEffects: ComponentReducerState["sideEffects"],
  hoverActions: ComponentReducerState["hoverActions"],
  activeActions: ComponentReducerState["activeActions"],
  focusActions: ComponentReducerState["focusActions"],
) {
  let props = {};

  for (const key in configStates) {
    const configState = configStates[key];
    Object.assign(props, configState.props);
  }

  return {
    ...previousState,
    props,
    configStates,
    variables,
    containers,
    sideEffects,
    hoverActions,
    activeActions,
    focusActions,
  };
}
