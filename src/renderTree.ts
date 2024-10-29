import type { InteropReducerState } from "./interopReducer";

export function updateRenderTree(
  previousState: InteropReducerState,
  configStates: InteropReducerState["configStates"],
  variables: InteropReducerState["variables"],
  containers: InteropReducerState["containers"],
  sideEffects: InteropReducerState["sideEffects"],
  hoverActions: InteropReducerState["hoverActions"],
  activeActions: InteropReducerState["activeActions"],
  focusActions: InteropReducerState["focusActions"]
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
