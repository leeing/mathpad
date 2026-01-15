I have identified the causes for both issues:

1. **Blank Screen**: Caused by the `VerifyPanel` component returning `undefined` instead of `null` when the tool is inactive. React requires components to return `null` or a valid element.
2. **Scale Issue (y=x^2 mismatch)**: The current implementation maps 1 pixel to 1 mathematical unit. The grid is drawn every 50 pixels, but the function graph calculates values based on pixels. This means $x=50$ (1 grid line) is treated as $x=50$ in the formula, resulting in a huge Y value, instead of $x=1$.

**Plan to Fix:**

1. **Fix Blank Screen**:

   * Modify `src/components/VerifyPanel.tsx` to explicitly `return null;` instead of just `return;`.

2. **Fix Coordinate System & Grid**:

   * Define a constant `PIXELS_PER_UNIT = 50`.

   * Update `src/components/elements/FunctionGraph.tsx` to scale inputs and outputs:

     * Convert screen X to math X: `xMath = xScreen / 50`

     * Calculate `yMath`

     * Convert math Y to screen Y: `yScreen = yMath * 50`

   * Update `src/components/Grid.tsx` to add **Coordinate Labels** (1, 2, 3...) to the axes so the scale is clear to the user.

