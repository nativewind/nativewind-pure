import type { EasingFunction, Time } from "lightningcss";
import type { makeMutable } from "react-native-reanimated";
import type { Declarations } from "./declarations";
import { animationFamily } from "./globals";
import type { ConfigReducerState } from "./reducers/config";
import { resolveValue, type ResolveOptions } from "./resolvers";
import type {
  AnimationIO,
  AnimationProperties,
  AnimationPropIO,
  AnimationStep,
  RawAnimation,
  SharedValueAnimationIO,
  SideEffectTrigger,
} from "./types";
import type { Effect } from "./utils/observable";
import { defaultValues, setValue } from "./utils/properties";

export type ReanimatedMutable<Value> = ReturnType<typeof makeMutable<Value>>;
export type AnimationMutable = ReanimatedMutable<number>;

/**
 * Animations are all linked. If any animation property changes, all animations
 * will restart.
 */
export function buildAnimationSideEffects(
  next: Declarations,
  previous?: Declarations,
) {
  if (!next.animation) return next;

  const {
    name: names = defaultAnimation.name,
    duration: durations = defaultAnimation.duration,
    delay: delays = defaultAnimation.delay,
    timingFunction: baseEasingFuncs = defaultAnimation.timingFunction,
    iterationCount: iterationList = defaultAnimation.iterationCount,
  } = Object.assign({}, ...next.animation) as AnimationProperties;

  if (!names.length) return next;

  try {
    const { makeMutable, cancelAnimation } = require("react-native-reanimated");

    let sideEffects: SideEffectTrigger[] = [];
    const sharedValues: Map<string, AnimationMutable> = new Map();
    const previousSharedValues = previous?.sharedValues;

    let previousNames: Set<string> | undefined;
    if (previous?.sharedValues) {
      previousNames = new Set(previous.sharedValues.keys());
    }

    for (let index = 0; index < names.length; index++) {
      const animationName = names[index];

      // If any animation is set to none, we should cancel all animations
      if (animationName.type === "none") {
        continue;
      }

      const name = animationName.value;
      let mutable = sharedValues.get(name);
      if (!mutable) {
        mutable = makeMutable(0) as AnimationMutable;
        sharedValues.set(name, mutable);
      }

      const animation = next.get(animationFamily(name));
      if (!animation) {
        continue;
      }

      /**
       * Set the default style for the animation
       * These values are used when the animation is removed or missing
       * values
       */
      let start = 0;
      const delay = timeToMS(delays[index % delays.length]);
      const duration = timeToMS(durations[index % durations.length]);
      const baseEasingFunction =
        baseEasingFuncs[index % baseEasingFuncs.length];
      const maxIterations = iterationList[index % iterationList.length];
      let iterations =
        // Non-positive values represent an infinite loop
        maxIterations.type === "infinite" ? -1 : maxIterations.value;

      /**
       * When delay < 0, the animation immediately starts and jumps ahead by the delayed amount
       */
      if (delay < 0) {
        const absDelay = Math.abs(delay);
        const iterationsPerformed = Math.floor(absDelay / duration);
        iterations -= iterationsPerformed;

        start =
          iterations > 1
            ? // If we are still repeating, work out the new starting progress
              (absDelay % duration) / duration
            : // Else we have finished
              1;
      }

      sideEffects.push(() => {
        // Reset the animation to the starting value
        mutable.value = start;
        // Start the animation
        mutable.value = getAnimationTiming(
          mutable,
          animation.s,
          0,
          0,
          duration,
          maxIterations.type === "infinite" ? Infinity : maxIterations.value,
          false,
          true,
          baseEasingFunction,
        );
      });
    }

    /**
     * When cancelling animations, we don't need to cancel animations from this
     * render, as they haven't started yet. We only need to cancel animations
     * from the previous render(s).
     */
    if (previousNames && previousNames.size) {
      // Cancel any animations that are no longer present
      sideEffects.push(
        ...Array.from(previousNames, (name) => {
          const mutable = previousSharedValues!.get(name)!;
          previousSharedValues?.delete(name);
          return () => {
            mutable.value = 0;
            cancelAnimation(mutable);
          };
        }),
      );
    }

    next.sideEffects = sideEffects;
    next.sharedValues = sharedValues;

    return next;
  } catch {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "[CssInterop] Attempted to use animation without react-native-reanimated installed",
      );
    }

    return next;
  }
}

export function getAnimationIO(
  state: ConfigReducerState,
  effect: Effect,
  options: ResolveOptions,
) {
  const sharedValues = state.declarations?.sharedValues;
  if (!sharedValues) return;

  const animationNames = state.declarations?.animation?.findLast(
    (value) => "name" in value,
  )?.name;

  if (!animationNames) return;

  const sharedValueIO: SharedValueAnimationIO[] = [];

  for (const name of animationNames) {
    if (name.type === "none") {
      continue;
    }

    const propIO: AnimationPropIO[] = [];
    const sharedValue = sharedValues.get(name.value);

    const animation = effect.get(animationFamily(name.value));
    if (!animation || !sharedValue) {
      continue;
    }

    let progress = 0;
    for (const propertyFrame of animation.p) {
      const frames = propertyFrame[1];
      const io: AnimationIO = [[], []];

      for (const frame of frames) {
        progress += frame[0] - progress;

        io[0].push(progress);
        io[1].push(
          frame[1] === "!INHERIT!"
            ? frame[1]
            : resolveValue(state, frame[1], options),
        );
      }

      propIO.push([propertyFrame[0], io, false]);
    }

    sharedValueIO.push([sharedValue, propIO]);
  }

  return sharedValueIO;
}

export function getAnimationTiming(
  mutable: AnimationMutable,
  steps: AnimationStep[],
  index: number,
  progress: number,
  totalDuration: number,
  iterations: number,
  repeat = false,
  forwards = true,
  easing: EasingFunction = { type: "linear" },
) {
  const { withTiming, Easing } = require("react-native-reanimated");

  const step = steps[index];
  const target = typeof step === "number" ? step : step[0];
  const duration = totalDuration * target - progress;

  if (typeof step !== "number" && target === 0) {
    easing = step[1];
  }

  return withTiming(
    target,
    { duration, easing: getEasing(easing, Easing) },
    () => {
      if (typeof step !== "number") {
        easing = step[1];
      }

      const nextIndex = forwards ? index + 1 : index - 1;

      if (nextIndex > -1 && nextIndex < steps.length) {
        progress += forwards ? duration : -duration;

        mutable.value = getAnimationTiming(
          mutable,
          steps,
          nextIndex,
          progress,
          totalDuration,
          iterations,
          repeat,
          forwards,
          easing,
        );
      } else if (iterations > 1) {
        if (repeat) forwards = !forwards;

        const startingIndex = forwards ? 0 : steps.length - 1;

        const staringProgress = forwards ? 0 : 1;

        mutable.value = getAnimationTiming(
          mutable,
          steps,
          startingIndex,
          staringProgress,
          totalDuration,
          iterations - 1,
          repeat,
          forwards,
          easing,
        );
      }
    },
  );
}

export function getEasing(
  timingFunction: EasingFunction,
  Easing: (typeof import("react-native-reanimated"))["Easing"],
) {
  switch (timingFunction.type) {
    case "ease":
      return Easing.ease;
    case "ease-in":
      return Easing.in(Easing.quad);
    case "ease-out":
      return Easing.out(Easing.quad);
    case "ease-in-out":
      return Easing.inOut(Easing.quad);
    case "linear":
      return Easing.linear;
    case "cubic-bezier":
      return Easing.bezier(
        timingFunction.x1,
        timingFunction.y1,
        timingFunction.x2,
        timingFunction.y2,
      );
    default:
      return Easing.linear;
  }
}

const timeToMS = (time: Time) => {
  return time.type === "milliseconds" ? time.value : time.value * 1000;
};

export function getAnimationDefaults(rawAnimation: RawAnimation) {
  const style: Record<string, any> = {};

  for (const frame of rawAnimation.p) {
    const prop = frame[0];
    setValue(style, prop, defaultValues[prop]);
  }

  return style;
}

const defaultAnimation: Required<AnimationProperties> = {
  name: [],
  direction: ["normal"],
  fillMode: ["none"],
  iterationCount: [{ type: "number", value: 1 }],
  timingFunction: [{ type: "linear" }],
  playState: ["running"],
  duration: [{ type: "seconds", value: 0 }],
  delay: [{ type: "seconds", value: 0 }],
  timeline: [{ type: "none" }],
};
