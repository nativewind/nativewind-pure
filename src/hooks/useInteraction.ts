import { useCallback } from "react";
import { activeFamily, focusFamily, hoverFamily } from "../globals";
import type { ComponentReducerState } from "../reducers/component";

type InteractionType =
  | "onHoverIn"
  | "onHoverOut"
  | "onPress"
  | "onPressIn"
  | "onPressOut"
  | "onFocus"
  | "onBlur";

/**
 * Create a function that returns a handler for a specific interaction type.
 * This function will be memoized and reused for the lifetime of the component.
 */
function buildHandlerFamily() {
  const weakMap = new WeakMap<
    Function,
    Map<InteractionType, (event: unknown) => void>
  >();

  return function (
    type: InteractionType,
    mainHandler: (type: InteractionType, event: unknown) => void,
  ) {
    let map = weakMap.get(mainHandler);

    if (!map) {
      map = new Map();
      weakMap.set(mainHandler, map);
    }

    let handler = map.get(type);

    if (!handler) {
      handler = (event) => mainHandler(type, event);
      map.set(type, handler);
    }

    return handler;
  };
}

export const handlerFamily = buildHandlerFamily();

export function useInteraction(
  state: ComponentReducerState,
  props: Record<string, any>,
) {
  /**
   * Any styles that use the hover, active, or focus states would have
   * accessed the family for that type.
   */
  const status = {
    hover: hoverFamily.has(state.key),
    active: activeFamily.has(state.key),
    focus: focusFamily.has(state.key),
  };

  /**
   * Create a handler for each interaction type, and as the key for sub-handlers
   */
  const handler = useCallback(
    (type: InteractionType, event: unknown) => {
      switch (type) {
        case "onHoverIn":
          props.onHover?.(event);
          hoverFamily(state.key).set(true);
          break;
        case "onHoverOut":
          props.onHover?.(event);
          hoverFamily(state.key).set(true);
          break;
        case "onPress":
          props.onPress?.(event);
          break;
        case "onPressIn":
          props.onPressIn?.(event);
          activeFamily(state.key).set(true);
          break;
        case "onPressOut":
          props.onPressOut?.(event);
          activeFamily(state.key).set(false);
          break;
        case "onFocus":
          props.onFocus?.(event);
          focusFamily(state.key).set(true);
          break;
        case "onBlur":
          props.onBlur?.(event);
          focusFamily(state.key).set(false);
          break;
      }
    },
    [state, props],
  );

  return [status, handler] as const;
}
