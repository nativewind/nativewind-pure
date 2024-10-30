import { Appearance, type ColorSchemeName } from "react-native";
import { renderHook } from "@testing-library/react-hooks";
import { buildUseInterop, styleFamily, variableFamily } from "../src";
import { addStyle, resultHelper, stripUndefined, wrapper } from "./utils";

const type = () => null;

jest.mock("react-native", () => {
  return {
    Dimensions: {
      get: jest.fn(),
    },
    Appearance: {
      getColorScheme: jest.fn(),
    },
  };
});

export const getColorSchemeMock =
  Appearance.getColorScheme as jest.Mock<ColorSchemeName>;

beforeEach(() => {
  jest.clearAllMocks();
  styleFamily.clear();
  variableFamily.clear();
});

test("empty props", () => {
  getColorSchemeMock.mockReturnValue("dark");

  const useInterop = buildUseInterop(type, {
    source: "className",
    target: "style",
  });

  const { result } = renderHook(({ props }) => useInterop(props), {
    initialProps: { props: {} },
    wrapper,
  });

  expect(stripUndefined(result.current)).toStrictEqual(
    resultHelper(result.current, {}),
  );
});

test("basic className", () => {
  addStyle("text-red-500", [{ color: "red" }]);

  const useInterop = buildUseInterop(type, {
    source: "className",
    target: "style",
  });

  const { result } = renderHook(({ props }) => useInterop(props), {
    initialProps: { props: { className: "text-red-500" } },
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
      // {
      //   declarations: {
      //     epoch: 0,
      //     normal: [{ d: [{ color: "red" }], s: [0] }],
      //     guards: [{ type: "prop", name: "className", value: "text-red-500" }],
      //   },
      // }
    ),
  );
});

test("transform prop", () => {
  addStyle("rotate-90", [["90deg", "^rotate"]]);
  const useInterop = buildUseInterop(type, {
    source: "className",
    target: "style",
  });

  const { result } = renderHook(({ props }) => useInterop(props), {
    initialProps: { props: { className: "rotate-90" } },
    wrapper,
  });

  expect(stripUndefined(result.current)).toStrictEqual(
    resultHelper(result.current, {
      props: {
        style: { transform: [{ rotate: "90deg" }] },
      },
    }),
  );
});

test("variables", () => {
  addStyle("text-[--color]", [[[{}, "var", ["color"]], "^color", 1]]);
  const useInterop = buildUseInterop(type, {
    source: "className",
    target: "style",
  });

  const { result, rerender } = renderHook(({ props }) => useInterop(props), {
    wrapper,
    initialProps: {
      props: { className: "text-[--color]" },
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
          epoch: 1,
          normal: [{ d: [[[{}, "var", ["color"]], "^color", 1]], s: [0] }],
          guards: [
            { type: "prop", name: "className", value: "text-[--color]" },
          ],
        },
        styles: {
          epoch: 1,
          guards: [{ type: "variable", name: "color", value: "red" }],
        },
      },
    ),
  );

  rerender({
    props: { className: "text-[--color]" },
    inheritedVariables: { color: "blue" },
  });

  expect(stripUndefined(result.current)).toStrictEqual(
    resultHelper(
      result.current,
      {
        props: {
          style: { color: "blue" },
        },
      },
      // {
      //   declarations: {
      //     epoch: 0,
      //     normal: [{ d: [[[{}, "var", ["color"]], "^color", 1]], s: [0] }],
      //     guards: [
      //       { type: "prop", name: "className", value: "text-[--color]" },
      //     ],
      //   },
      //   styles: {
      //     epoch: 1,
      //     guards: [{ type: "variable", name: "color", value: "blue" }],
      //   },
      // }
    ),
  );
});
