Based on your new role as a **Middle School Math Teacher** creating exam questions, I will pivot the development focus from "Exploration" to "Authoring & Exporting".

Here is the plan to transform MathPad into an Exam Question Authoring Tool:

### Phase 1: Exam-Style Rendering (The "Paper Look")
Exam questions are black & white, precise, and clean.
*   **Support Dashed Lines**: Essential for auxiliary lines (heights, medians).
    *   *Tech*: Update `GeoStyle` to support `dash` array (e.g., `[5, 5]`).
*   **Black & White Defaults**: Change default element colors from "App Blue" to "Exam Black".
*   **Canvas Controls**: Add toggles to **Hide Grid** and **Hide Axes** so you can screenshot a clean white background.

### Phase 2: Selection & Property Panel
You need to adjust lines after drawing them.
*   **Selection Logic**: When you click an object, a **Property Panel** will appear.
*   **Features**:
    *   **Line Style**: Toggle between Solid / Dashed / Dotted.
    *   **Visibility**: Hide/Show specific objects (e.g., hide the construction circle, keep the arc).
    *   **Delete**: Quickly remove unwanted elements.

### Phase 3: Export for Word/LaTeX
*   **Export Image**: Add a "Download PNG" button to save the current view as a high-quality image to paste into your exam document.

I will start with **Phase 1 & 2** immediately to give you the basic styling capabilities.

**Step-by-step Implementation:**
1.  **Update Data Models**: Add `dash` property to styles and `showGrid/showAxis` to the view store.
2.  **Implement View Toggles**: Add buttons to control grid visibility.
3.  **Create Property Panel**: Build the UI to change line styles (Solid vs Dashed) for selected items.
4.  **Update Renderers**: Ensure Lines and Circles render correctly with the new dash properties.