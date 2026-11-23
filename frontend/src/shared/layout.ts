export const SCREEN_PADDING = 20;
export const CONTENT_MAX_WIDTH = 560;

// Spread into a screen's outer style: { ...screenColumn, flex: 1, ... }
export const screenColumn = {
  width: "100%",
  maxWidth: CONTENT_MAX_WIDTH,
  alignSelf: "center",
  paddingHorizontal: SCREEN_PADDING,
} as const;


export const FORM_MAX_WIDTH = 420;

export const formColumn = {
  width: "100%",
  maxWidth: FORM_MAX_WIDTH,
  alignSelf: "center",
  paddingHorizontal: SCREEN_PADDING,
} as const;