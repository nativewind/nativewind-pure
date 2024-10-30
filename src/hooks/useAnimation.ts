import {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
} from "react-native-reanimated";
import type { ComponentReducerState } from "../reducers/component";
import type { SharedValueAnimationIO, TransitionTuple } from "../types";

/**
 * Wrapper around useAnimatedStyle that allows for animations and transitions.
 * Note: This only sets the style properties that are animated or transitioned,
 *       the SharedValue is controlled via the SideEffects useEffect() in useInterop()
 * @param originalStyle
 * @param animations
 * @param transitions
 * @returns
 */
export function useAnimation(state: ComponentReducerState) {
  const animations = state.animations;
  const transitions = state.transitions;
  const originalStyle = state.props?.style as Record<string, any> | undefined;

  return useAnimatedStyle(() => {
    const style: Record<string, any> = { ...originalStyle };

    const seenProperties = new Set<string>();

    if (transitions) {
      for (const [prop, sharedValue] of transitions) {
        if (seenProperties.has(prop)) {
          continue;
        }

        seenProperties.add(prop);

        style[prop] = sharedValue.value;
      }
    }

    if (animations) {
      for (const [sharedValue, animationIO] of animations) {
        const progress = sharedValue.value;

        for (const animation of animationIO) {
          const prop = animation[0];
          const interpolation = animation[1];

          if (!interpolation) continue;

          const interpolateFn = animation[2] ? interpolateColor : interpolate;

          const value = interpolateFn(
            progress,
            interpolation[0],
            interpolation[1],
          );

          style[prop] = value;
        }
      }
    }

    return style;
  }, [animations, transitions]);
}
