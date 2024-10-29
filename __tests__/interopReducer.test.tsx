import type { PropsWithChildren } from "react";

import { renderHook } from "@testing-library/react-hooks";

jest.mock("fs");

import {
  ContainerContext,
  UniversalVariableContext,
  VariableContext,
  type ContainerContextValue,
  type VariableContextValue,
} from "../src/contexts";
import { buildUseInterop } from "../src/useInterop";
import type { InteropReducerState } from "../src/interopReducer";
import type { ConfigReducerState } from "../src/configReducer";
import type { ConfigStates } from "../src/types";
import { styleFamily, variableFamily } from "../src/globals";
import { observable } from "../src/observable";

type RenderHookProps = PropsWithChildren<{
  props: Record<string, any>;
  inheritedVariables?: VariableContextValue;
  universalVariables?: VariableContextValue;
  containers?: ContainerContextValue;
}>;

const type = () => null;

function wrapper({
  children,
  inheritedVariables = {},
  universalVariables = {},
  containers = {},
}: RenderHookProps) {
  return (
    <UniversalVariableContext.Provider value={universalVariables}>
      <VariableContext.Provider value={inheritedVariables}>
        <ContainerContext.Provider value={containers}>
          {children}
        </ContainerContext.Provider>
      </VariableContext.Provider>
    </UniversalVariableContext.Provider>
  );
}

function stripUndefined(obj: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(obj).flatMap(([key, value]) => {
      return value === undefined ? [] : [[key, value]];
    })
  );
}

/**
 * The InteropReducerState is a complex object with many optional/internal properties.
 * This helper function will strip out any undefined values and preserve the internal
 * structures for easier testing.
 * @param result
 * @param partial
 * @param configPartials
 * @returns
 */
function resultHelper(
  result: InteropReducerState,
  partial: Partial<InteropReducerState>,
  ...configPartials: Partial<ConfigReducerState>[]
) {
  if (configPartials.length) {
    const configStates: Readonly<ConfigStates> = Object.fromEntries(
      Object.entries(result.configStates).map(([key, value], index) => {
        return [key, { ...value, ...configPartials[index] }];
      })
    );

    return {
      ...stripUndefined(result),
      configStates,
      ...partial,
    };
  }

  return {
    ...stripUndefined(result),
    ...partial,
  };
}

beforeEach(() => {
  styleFamily.clear();
  variableFamily.clear();
});

test("empty props", () => {
  const useInterop = buildUseInterop(type, {
    source: "className",
    target: "style",
  });

  const { result } = renderHook(({ props }) => useInterop(props), {
    initialProps: { props: {} },
    wrapper,
  });

  expect(stripUndefined(result.current)).toStrictEqual(
    resultHelper(result.current, {})
  );
});

test("basic className", () => {
  const useInterop = buildUseInterop(type, {
    source: "className",
    target: "style",
  });

  const props = { className: "text-red-500" };

  styleFamily.set(
    "text-red-500",
    observable({
      n: [{ s: [0], d: [{ color: "red" }] }],
    })
  );

  const { result } = renderHook(({ props }) => useInterop(props), {
    initialProps: { props },
    wrapper,
  });

  expect(stripUndefined(result.current)).toStrictEqual(
    resultHelper(
      result.current,
      {
        props: {
          style: { color: "red" },
        },
      },
      {
        declarations: {
          epoch: 0,
          normal: [{ d: [{ color: "red" }], s: [0] }],
          guards: [{ type: "prop", name: "className", value: "text-red-500" }],
        },
      }
    )
  );
});

test("transform prop", () => {
  const useInterop = buildUseInterop(type, {
    source: "className",
    target: "style",
  });

  const props = { className: "rotate-90" };

  const styles = buildStyleStore({
    "rotate-90": {
      n: [{ s: [0], d: [["90deg", "^rotate"]] }],
    },
  });

  const { result } = renderHook(({ props }) => useInterop(props), {
    initialProps: { props, styles },
    wrapper,
  });

  expect(stripUndefined(result.current)).toStrictEqual(
    resultHelper(result.current, {
      props: {
        style: { transform: [{ rotate: "90deg" }] },
      },
    })
  );
});

test("variables", () => {
  const useInterop = buildUseInterop(type, {
    source: "className",
    target: "style",
  });

  const props = { className: "text-[--color]" };

  const styles = buildStyleStore({
    "text-[--color]": {
      n: [{ s: [0], d: [[[{}, "var", ["color"]], "^color", 1]] }],
    },
  });

  const { result, rerender } = renderHook(({ props }) => useInterop(props), {
    wrapper,
    initialProps: {
      props,
      styles,
      inheritedVariables: {
        color: "red",
      },
    },
  });

  expect(stripUndefined(result.current)).toStrictEqual(
    resultHelper(
      result.current,
      {
        props: {
          style: { color: "red" },
        },
      },
      {
        declarations: {
          epoch: 0,
          normal: [{ d: [[[{}, "var", ["color"]], "^color", 1]], s: [0] }],
          guards: [
            { type: "prop", name: "className", value: "text-[--color]" },
          ],
        },
        styles: {
          epoch: 0,
          guards: [{ type: "variable", name: "color", value: "red" }],
        },
      }
    )
  );

  rerender({ props, styles, inheritedVariables: { color: "blue" } });

  expect(stripUndefined(result.current)).toStrictEqual(
    resultHelper(
      result.current,
      {
        props: {
          style: { color: "blue" },
        },
      },
      {
        declarations: {
          epoch: 0,
          normal: [{ d: [[[{}, "var", ["color"]], "^color", 1]], s: [0] }],
          guards: [
            { type: "prop", name: "className", value: "text-[--color]" },
          ],
        },
        styles: {
          epoch: 1,
          guards: [{ type: "variable", name: "color", value: "blue" }],
        },
      }
    )
  );
});
