To address the request of updating the **Parabola** and **Ellipse** icons to be more visually representative of their mathematical shapes, I will replace the current generic icons with more specific SVG icons from `lucide-react` or custom SVG components if necessary.

Based on the `lucide-react` library:
1.  **Ellipse**: The `Orbit` icon is often used for ellipses, but if it's not specific enough, `Eclipse` or a custom SVG might be better. However, `lucide-react` has an `Orbit` icon which looks like an ellipse path. Wait, `Ellipse` icon exists in some versions, but let's check availability. Actually, the user wants "shape characteristics".
    *   **Current**: Likely using something generic.
    *   **Proposed**: Use `Orbit` (which depicts an elliptical orbit) or creating a custom SVG component inline for a perfect ellipse shape. Given the context of a math app, a clean SVG `<ellipse>` is best.

2.  **Parabola**: `lucide-react` doesn't have a specific "Parabola" icon.
    *   **Current**: Generic.
    *   **Proposed**: Create a custom SVG icon component that draws a quadratic curve (U-shape), which perfectly represents a parabola.

**Plan:**
1.  **Modify `src/components/Toolbar.tsx`**:
    *   Replace the icon for the 'ellipse' tool with a custom `EllipseIcon` component (using an SVG `<ellipse>`).
    *   Replace the icon for the 'parabola' tool with a custom `ParabolaIcon` component (using an SVG `<path>` for a quadratic curve).
    *   Ensure these new icons match the style (stroke width, color) of the existing Lucide icons.

**Why Custom SVGs?**
Standard icon libraries often lack specific mathematical curves like parabolas. Custom SVGs ensure the icon looks exactly like the mathematical concept (a U-shaped curve for parabola, a flattened circle for ellipse).

**Implementation Details:**
*   **EllipseIcon**: An SVG with an `<ellipse cx="12" cy="12" rx="10" ry="6" />`.
*   **ParabolaIcon**: An SVG with a path like `<path d="M4 4 Q12 20 20 4" />` (a quadratic Bezier curve).

This will directly solve the user's issue of the icons not being "image enough".