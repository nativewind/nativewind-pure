import {
  Appearance,
  Dimensions,
  type ColorSchemeName,
  type LayoutRectangle,
} from "react-native";
import { observable, weakFamily, family, mutable } from "./observable";
import type { StyleRuleSet, StyleValueDescriptor } from "./types";

/**
 * In development, these are observable to allow for hot-reloading.
 * In production these will be static StyleRuleSets.
 */
export const styleFamily = family(() => {
  return process.env.NODE_ENV === "production"
    ? mutable<StyleRuleSet>()
    : observable<StyleRuleSet>();
});

/**
 * In development, these are observable to allow for hot-reloading.
 * In production these will be static StyleValueDescriptors.
 */
export const variableFamily = family(() => {
  return process.env.NODE_ENV === "production"
    ? mutable<StyleValueDescriptor>()
    : observable<StyleValueDescriptor>();
});

export const rem = observable(14);

/**
 * Interactivity
 */
export const hoverFamily = weakFamily(() => {
  return observable<boolean>(false);
});

export const activeFamily = weakFamily(() => {
  return observable<boolean>(false);
});

export const focusFamily = weakFamily(() => {
  return observable<boolean>(false);
});

/**
 * Dimensions
 */
const dimensions = observable(Dimensions.get("window"));
export const vw = observable((read) => read(dimensions).width);
export const vh = observable((read) => read(dimensions).height);

/**
 * Color schemes
 */
export const systemColorScheme = observable<ColorSchemeName>();
export const appColorScheme = observable(
  (get) => {
    const value = get(systemColorScheme);
    return get(systemColorScheme) === undefined
      ? Appearance.getColorScheme()
      : value;
  },
  (set, value: ColorSchemeName) => {
    set(systemColorScheme, value);
    return value === undefined ? Appearance.getColorScheme() : value;
  }
);

/**
 * Containers
 */
export const containerLayoutFamily = weakFamily(() => {
  return observable<LayoutRectangle>();
});

export const containerWidthFamily = weakFamily((key) => {
  return observable((get) => {
    return get(containerLayoutFamily(key))?.width || 0;
  });
});

export const containerHeightFamily = weakFamily((key) => {
  return observable((get) => {
    return get(containerLayoutFamily(key))?.width || 0;
  });
});
