/**
 * https://drafts.csswg.org/selectors/#specificity-rules
 *
 * This is a holey array. See SpecificityIndex to know what each index represents.
 */
export type Specificity = SpecificityValue[];
export type SpecificityValue = number | undefined;

export const SpecificityIndex = {
  Order: 0,
  ClassName: 1,
  Important: 2,
  Inline: 3,
  PseudoElements: 4,
  // Id: 0, - We don't support ID yet
  // StyleSheet: 0, - We don't support multiple stylesheets
};
