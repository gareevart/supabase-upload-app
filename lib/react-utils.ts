
import * as React from "react";

// Utility for merging refs
export function useMergedRefs<T = any>(
  ...refs: Array<React.ForwardedRef<T> | React.RefObject<T> | null | undefined>
): React.RefCallback<T> {
  return React.useCallback((value: T) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") {
        ref(value);
      } else if (ref != null) {
        (ref as React.MutableRefObject<T>).current = value;
      }
    });
  }, [refs]);
}

// Don't attempt to modify the React namespace directly as it causes TypeScript errors
// Remove the problematic code:
// React.useMergedRefs = useMergedRefs;
// 
// declare module "react" {
//   // eslint-disable-next-line @typescript-eslint/no-unused-vars
//   interface React {
//     useMergedRefs: typeof useMergedRefs;
//   }
// }
