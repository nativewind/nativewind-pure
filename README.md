# NativeWind Pure

This is an experiment to rewrite the `useInterop()` hook to be pure with no side effects. This will allow NativeWind to be compiled with the `react-compiler-runtime` and use `react-native-reanimated@3.16`

This is a stripped back version of NativeWind without the compiler, jsx transform, and other features. This is just the internal state management within NativeWind.

This is a good resource if your interested in how NativeWind works internally

## Setup

```bash
// Install dependencies
bun install

// Run the test suite
bun run test
```

We use `jest` instead of `bun test` for `babel` support.

## Current concepts

### Synchronous rendering

- Styles should be rendered synchronously within the same render pass where possible

### Side effect free

- Outside of animations and transitions (which are side effects handled by `react-native-reanimated`), rendering should be side effect free

### No providers

- NativeWind should not require any providers to be wrapped around the app
- This should _just work_
- This **includes Fast Refresh**

### No unnecessary re-renders

- NativeWind is expensive to render, so we should avoid unnecessary re-renders

## Future concepts/ideas

### Caching

- Its hard to cache styles because they can change per component (e.g inline css variables)
- On native, will use the `${className}:${configStateId}` to cache the styles
- E.g `text-red-500 font-bold:$0` will cache the styles for `text-red-500 font-bold` for the current variable and container context
- If props[target] !== undefined, we skip the cache (due to the possibility of inline css variables)
- When a component sets a variable / container, this will create a new Cache
- Users can use `nativewind-cache/inherit` to prevent a new variables from creating a new cache (containers will always create a new cache)

### Optimizing types

- `<Text />` and `<View />` are the most common components, yet are rather slow to render
- `RTCView` and `RTCText` are faster to render, but are not as flexible
- Add new `can-optimize` prop to allow NativeWind to optimize the component if possible
- Like other type optimizations, this class is needed on the first render and cannot be removed
- Changing from optimized to non-optimized will cause a remount and will error in development
