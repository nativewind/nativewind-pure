/**
 * Animations
 */

import type { EasingFunction, Time } from "lightningcss";
import type { SharedValue } from "react-native-reanimated";
import type { StyleValueDescriptor } from "./styles";

type AnimationPropertyKey = string;
export type AnimationStep = number | [number, EasingFunction];
export type AnimationFrame = [AnimationPropertyKey, RuntimeValueFrame[]];
export type AnimationDescriptor = {
  [K in keyof CSSAnimation]?: CSSAnimation[K][];
};
export interface Animation {
  frames: AnimationFrame[];
  /**
   * The easing function for each frame
   */
  steps: AnimationStep[];
  requiresLayoutWidth?: boolean;
  requiresLayoutHeight?: boolean;
}
export interface RuntimeValueFrame {
  progress: number;
  value: StyleValueDescriptor;
}

type InterpolationIO = [number, number];
type InterpolationValues = [any, any];
export type AnimationIO =
  | [string, undefined]
  | [string, [InterpolationIO, InterpolationValues], boolean];
export type SharedValueAnimationIO = [SharedValue<number>, AnimationIO[]];

/**
 * Transitions
 */

export interface TransitionDescriptor {
  /**
   * The delay before the transition starts.
   */
  d?: Time[];
  /**
   * The duration of the transition.
   */
  t?: Time[];
  /**
   * The property to transition.
   */
  p?: string[];
  /**
   * The easing function for the transition.
   */
  f?: EasingFunction[];
}

export type TransitionTuple = [string, SharedValue<any>, any];
