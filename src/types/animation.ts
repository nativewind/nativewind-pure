/**
 * Animations
 */

import type {
  Animation as CSSAnimation,
  EasingFunction,
  Time,
} from "lightningcss";
import type { SharedValue } from "react-native-reanimated";
import type { StyleValueDescriptor } from "./styles";

type AnimationPropertyKey = string;
export type AnimationStep = number | [number, EasingFunction];
export type AnimationPropertyFrames =
  | [AnimationPropertyKey, RuntimeValueFrame[]]
  | [AnimationPropertyKey, RuntimeValueFrame[], true];
export type AnimationProperties = {
  [K in keyof CSSAnimation]?: CSSAnimation[K][];
};
export type RawAnimation = {
  p: AnimationPropertyFrames[];
  // The easing function for each frame
  s: AnimationStep[];
};
export type Animation = RawAnimation & {
  defaults: Record<string, any>;
};
export type RuntimeValueFrame = [number, StyleValueDescriptor];

export type AnimationIO = Readonly<[number[], any[]]>;
export type AnimationPropIO = [string | string[], AnimationIO, boolean];
export type SharedValueAnimationIO = [SharedValue<number>, AnimationPropIO[]];

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
