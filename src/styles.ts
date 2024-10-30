import type { ContainerContextValue, VariableContextValue } from "./contexts";
import type { ConfigReducerState } from "./reducers/config";
import type { ResolveOptions } from "./resolvers";
import { resolveValue } from "./resolvers";
import type {
  Callback,
  InlineStyle,
  RenderGuard,
  SideEffectTrigger,
  StyleRule,
  StyleValueDescriptor,
} from "./types";
import { Effect } from "./utils/observable";

export type Styles = Effect & {
  epoch: number;
  guards: RenderGuard[];
  props?: Record<string, any>;
  sideEffects?: SideEffectTrigger[];
};

export function buildStyles(
  state: ConfigReducerState,
  incomingProps: Record<string, unknown>,
  inheritedVariables: VariableContextValue,
  universalVariables: VariableContextValue,
  inheritedContainers: ContainerContextValue,
  run: () => void,
) {
  const next: Styles = {
    epoch: state.styles ? state.styles.epoch : 0,
    guards: [],
    run,
    dependencies: new Set(),
    get(readable) {
      return readable.get(next);
    },
  };

  const delayedStyles: Callback[] = [];

  const resolveOptions: ResolveOptions = {
    getProp: (name: string) => {
      next.guards?.push({
        type: "prop",
        name: name,
        value: incomingProps[name],
      });
      return incomingProps[name] as StyleValueDescriptor;
    },
    getVariable: (name: string) => {
      let value: StyleValueDescriptor;

      value ??=
        universalVariables instanceof Map
          ? universalVariables.get(name)
          : universalVariables?.[name];

      value ??=
        inheritedVariables instanceof Map
          ? inheritedVariables.get(name)
          : inheritedVariables?.[name];

      next.guards?.push({ type: "variable", name: name, value });

      return value;
    },
    getContainer: (name: string) => {
      const value = inheritedContainers[name];
      next.guards?.push({ type: "container", name: name, value });
      return value;
    },
  };

  if (state.declarations?.normal) {
    next.props = applyStyles(
      next.props,
      state.declarations?.normal,
      state,
      delayedStyles,
      resolveOptions,
    );
  }

  if (state.declarations?.important) {
    next.props = applyStyles(
      next.props,
      state.declarations?.important,
      state,
      delayedStyles,
      resolveOptions,
    );
  }

  if (delayedStyles.length) {
    for (const delayedStyle of delayedStyles) {
      delayedStyle();
    }
  }

  next.epoch++;
  return next;
}

function applyStyles(
  props: Record<string, any> | undefined,
  styleRules: StyleRule[],
  state: ConfigReducerState,
  delayedStyles: Callback[],
  resolveOptions: ResolveOptions,
) {
  for (const styleRule of styleRules) {
    if (styleRule.d) {
      for (const declaration of styleRule.d) {
        if (Array.isArray(declaration)) {
          let value: any = declaration[0];

          if (Array.isArray(value)) {
            const shouldDelay = declaration[2];

            if (shouldDelay) {
              /**
               * We need to delay the resolution of this value until after all
               * styles have been calculated. But another style might override
               * this value. So we set a placeholder value and only override
               * if the placeholder is preserved
               *
               * This also ensures the props exist, so setValue will properly
               * mutate the props object and not create a new one
               */
              const originalValue = value;
              value = {};
              delayedStyles.push(() => {
                const placeholder = value;
                value = resolveValue(state, originalValue, resolveOptions);
                setValue(state, declaration[1], value, props, placeholder);
              });
            } else {
              value = resolveValue(state, value, resolveOptions);
            }
          }

          // This mutates and/or creates the props object
          props = setValue(state, declaration[1], value, props);
        } else {
          props ??= {};
          props.style ??= {};
          Object.assign(props.style, declaration);
        }
      }
    }
  }

  return props;
}

function setValue(
  state: ConfigReducerState,
  paths: string | string[],
  value: string | number | InlineStyle,
  rootProps: Record<string, any> = {},
  // Only set the value if the current value is a placeholder
  placeholder?: Record<string, any>,
) {
  let props = rootProps;
  const target = state.config.target;

  if (typeof paths === "string") {
    assignFinalValueToProps(props, paths, value, target, placeholder);
    return rootProps;
  }

  for (let i = 0; i < paths.length; i++) {
    let path = paths[i];

    if (i === 0 && path.startsWith("^")) {
      path = path.slice(1);
      props ??= {};
      props[target] ??= {};
      props = props[target];
    }

    if (i === paths.length - 1) {
      assignFinalValueToProps(props, path, value, target, placeholder);
      return rootProps;
    }

    props ??= {};
    props[path] ??= {};
    props = props[path];
  }

  return rootProps;
}

function assignFinalValueToProps(
  props: Record<string, any>,
  path: string,
  value: unknown,
  target: string,
  // Only set the value if the current value is a placeholder
  placeholder?: Record<string, any>,
): void {
  if (path.startsWith("^")) {
    path = path.slice(1);
    props[target] ??= {};
    props = props[target];
  }

  target = path;

  if (transformKeys.has(target)) {
    props ??= {};
    props.transform ??= [];

    let transformObj = props.transform.find(
      (obj: Record<string, unknown>) => obj[target] !== undefined,
    );

    if (!transformObj) {
      transformObj = {};
      props.transform.push(transformObj);
    }

    // If we have a placeholder, only set the value if the current value is the placeholder
    if (placeholder && transformObj[target] !== placeholder) {
      return;
    }

    transformObj[target] = value;
  } else {
    // If we have a placeholder, only set the value if the current value is the placeholder
    if (placeholder && props[target] !== placeholder) {
      return;
    }

    props[target] = value;
  }
}

export const transformKeys = new Set([
  "translateX",
  "translateY",
  "scale",
  "scaleX",
  "scaleY",
  "rotate",
  "rotateX",
  "rotateY",
  "rotateZ",
  "skewX",
  "skewY",
  "perspective",
  "matrix",
  "transformOrigin",
]);
