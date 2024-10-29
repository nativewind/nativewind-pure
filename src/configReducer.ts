import type { VariableContextValue, ContainerContextValue } from "./contexts";
import type {
  Callback,
  ConfigWithKey,
  InlineStyle,
  SideEffectTrigger,
  StyleRule,
  StyleValueDescriptor,
} from "./types";
import { resolveValue, type ResolveOptions } from "./resolvers";
import type { Dispatch } from "react";
import type { InteropReducerAction } from "./interopReducer";
import { Effect } from "./observable";
import { styleFamily } from "./globals";

export type ConfigReducerState = Readonly<{
  // The key of the config, used to group props, variables, containers, etc.
  key: string;
  // The config that this state is for
  config: ConfigWithKey;
  source?: string | null | undefined;
  target?: Record<string, unknown> | null | undefined;

  declarations?: DeclarationStore;
  styles?: StyleStore;

  // The props produced by the config
  props?: Record<string, unknown>;
  // The variables produced by the config
  variables?: Record<string, StyleValueDescriptor>;
  // The containers produced by the config
  containers?: Record<string, unknown>;
  // The side effects produced by the config
  sideEffects?: SideEffectTrigger[];
  // The hover actions produced by the config
  hoverActions?: ConfigReducerAction[];
  // The active actions produced by the config
  activeActions?: ConfigReducerAction[];
  // The focus actions produced by the config
  focusActions?: ConfigReducerAction[];
}>;

type RenderGuard =
  | { type: "prop"; name: string; value: unknown }
  | { type: "variable"; name: string; value: unknown }
  | { type: "container"; name: string; value: unknown };

export type ConfigReducerAction = Readonly<
  { type: "update-styles" } | { type: "update-definitions" }
>;

export function configReducer(
  state: ConfigReducerState,
  action: ConfigReducerAction,
  dispatch: Dispatch<InteropReducerAction>,
  incomingProps: Record<string, unknown>,
  inheritedVariables: VariableContextValue,
  universalVariables: VariableContextValue,
  inheritedContainers: ContainerContextValue
) {
  switch (action.type) {
    case "update-definitions": {
      const nextState = updateDefinitions(state, dispatch, incomingProps);
      return Object.is(state, nextState)
        ? state
        : updateStyles(
            nextState,
            incomingProps,
            inheritedVariables,
            universalVariables,
            inheritedContainers
          );
    }
    case "update-styles": {
      return updateStyles(
        state,
        incomingProps,
        inheritedVariables,
        universalVariables,
        inheritedContainers
      );
    }
    default: {
      action satisfies never;
      return state;
    }
  }
}

function updateDefinitions(
  state: ConfigReducerState,
  dispatch: Dispatch<InteropReducerAction>,
  props: Record<string, unknown>
): ConfigReducerState {
  const source = props[state.config.source] as string;
  const target = props[state.config.target] as InlineStyle;

  // Has this component ever seen styles?
  const initialized = state.declarations;

  // Is there anything to do?
  if (!initialized && !source && !target) {
    return state;
  }

  if (!state.declarations) {
    return {
      ...state,
      declarations: new DeclarationStore(state, props, () => {
        dispatch({
          type: "perform-config-reducer-actions",
          actions: [{ action: { type: "update-definitions" }, key: state.key }],
        });
      }),
      styles: new StyleStore(() => {
        dispatch({
          type: "perform-config-reducer-actions",
          actions: [{ action: { type: "update-styles" }, key: state.key }],
        });
      }),
    };
  }

  return state.declarations.update(state, props);
}

class DeclarationStore extends Effect {
  epoch = 0;
  normal?: StyleRule[];
  important?: StyleRule[];
  guards?: RenderGuard[];

  constructor(
    state: ConfigReducerState,
    props: Record<string, any>,
    public run: () => void
  ) {
    super(run);
    this.update(state, props);
  }

  update(state: ConfigReducerState, props: Record<string, any>) {
    const source = props[state.config.source] as string;
    const target = props[state.config.target] as InlineStyle;

    // TODO: Bail early if nothings has changed
    const normal: StyleRule[] = [];
    const important: StyleRule[] = [];
    const guards: RenderGuard[] = [
      { type: "prop", name: state.config.source, value: source },
    ];

    for (const className of source.split(/\s+/)) {
      const styleRuleSet = this.get(styleFamily(className));
      if (!styleRuleSet) {
        continue;
      }

      collectDefinitions(styleRuleSet.n, normal);
      collectDefinitions(styleRuleSet.i, important);
    }

    this.epoch++;
    this.normal = normal;
    this.important = important;
    this.guards = guards;

    return state;
  }

  cleanup() {
    super.cleanup();
    this.normal = undefined;
    this.important = undefined;
    this.guards = undefined;
  }
}

class StyleStore extends Effect {
  epoch = 0;
  guards?: RenderGuard[];

  constructor(public run: () => void) {
    super(run);
  }
}

/**
 * Mutates the collection with valid style rules
 * @param styleRules
 * @param collection
 * @returns
 */
function collectDefinitions(
  styleRules: StyleRule[] | undefined,
  collection: StyleRule[]
) {
  if (!styleRules) return;
  for (const styleRule of styleRules) {
    collection.push(styleRule);
  }
}

function updateStyles(
  state: ConfigReducerState,
  incomingProps: Record<string, unknown>,
  inheritedVariables: VariableContextValue,
  universalVariables: VariableContextValue,
  inheritedContainers: ContainerContextValue
) {
  let props: Record<string, any> | undefined;

  const delayedStyles: Callback[] = [];

  const guards: RenderGuard[] = [];
  const resolveOptions: ResolveOptions = {
    getProp(name: string) {
      guards.push({ type: "prop", name: name, value: incomingProps[name] });
      return incomingProps[name] as StyleValueDescriptor;
    },
    getVariable(name: string) {
      let value: StyleValueDescriptor;

      value ??=
        universalVariables instanceof Map
          ? universalVariables.get(name)
          : universalVariables?.[name];

      value ??=
        inheritedVariables instanceof Map
          ? inheritedVariables.get(name)
          : inheritedVariables?.[name];

      guards.push({ type: "variable", name: name, value });

      return value;
    },
    getContainer(name: string) {
      const value = inheritedContainers[name];
      guards.push({ type: "container", name: name, value });
      return value;
    },
  };

  if (state.declarations?.normal) {
    props = applyStyles(
      props,
      state.declarations?.normal,
      state,
      delayedStyles,
      resolveOptions
    );
  }

  if (state.declarations?.important) {
    props = applyStyles(
      props,
      state.declarations?.important,
      state,
      delayedStyles,
      resolveOptions
    );
  }

  if (delayedStyles.length) {
    for (const delayedStyle of delayedStyles) {
      delayedStyle();
    }
  }

  const nextState: ConfigReducerState = {
    ...state,
    props,
  };

  return nextState;
}

function applyStyles(
  props: Record<string, any> | undefined,
  styleRules: StyleRule[],
  state: ConfigReducerState,
  delayedStyles: Callback[],
  resolveOptions: ResolveOptions
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
  placeholder?: Record<string, any>
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
  placeholder?: Record<string, any>
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
      (obj: Record<string, unknown>) => obj[target] !== undefined
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
