I have analyzed the current codebase and confirmed that the interactive creation modes for parabolas ("Focus + Directrix" and "Vertex + Focus") are unimplemented, and the current data model only supports standard equations ($x^2=4py$ etc.).

**The Plan:**

1.  **Update Data Models (`geoElements.ts`)**:
    *   Update `ParabolaElement` to support a general equation form or geometric definition. Since general parabolas can be rotated, storing just `vertex`, `p`, and `direction` is insufficient for the "General Equation" requirement.
    *   However, for the specific request of "General Equation" ($y = ax^2 + bx + c$), this is a function. But to treat it as a geometric object (rotatable), we might need a more robust definition.
    *   **Decision**: For "General Equation", I will add a new definition type `parabola_general_equation` storing coefficients $a, b, c$ for $y = ax^2 + bx + c$ (and potentially $x = ay^2 + by + c$).
    *   For interactive modes, I need to ensure `definition` types `parabola_by_focus_directrix` and `parabola_by_vertex_focus` are fully supported in the element properties.

2.  **Implement Canvas Interactions (`CanvasStage.tsx`)**:
    *   Add logic to `handleStageClick` for `activeTool === 'parabola'`.
    *   **Focus + Directrix**:
        *   Step 1: Click to set Focus (create a point).
        *   Step 2: Click to select a Line (Directrix). *Wait, usually directrix is a line. If the user clicks empty space, maybe create a horizontal line?* Let's assume selecting an existing line or creating a horizontal line at that Y. The prompt says "Focus + Directrix", implying these might be geometric objects.
        *   *Refinement*: To keep it simple and consistent with other tools:
            *   **Focus + Directrix**: Click point (Focus), then click Line (Directrix). If Line doesn't exist, maybe just click two points to define the directrix line? Or click a point and drag to define directrix level?
            *   Let's stick to: Click Focus (Point) -> Click Directrix (Line). If no line exists, this mode is hard.
            *   *Alternative*: Click Focus -> Drag to define p distance?
            *   *User Intent*: "Focus + Directrix" usually means geometric construction.
    *   **Vertex + Focus**:
        *   Step 1: Click Vertex (Point).
        *   Step 2: Click Focus (Point).
        *   Calculate $p$ and direction from these two points.

3.  **Update Parabola Rendering (`Parabola.tsx`)**:
    *   Update the calculation logic to handle the new definitions.
    *   For "General Equation", plot points based on $y = ax^2 + bx + c$.
    *   For "Vertex + Focus", calculate the standard form parameters dynamically.

4.  **Update UI (`ConicPanel.tsx`)**:
    *   Add input fields for the General Equation ($y = ax^2+bx+c$).

**Step-by-Step Implementation Plan:**

1.  **Modify `GeoDefinition`**: Add `parabola_general` type.
2.  **Update `ConicPanel`**: Add "General Equation" mode UI.
3.  **Update `CanvasStage`**: Implement the click handlers for `vertex_focus` and `focus_directrix`.
    *   *Vertex+Focus*: Create/Select Vertex -> Create/Select Focus -> Add Parabola.
    *   *Focus+Directrix*: Create/Select Focus -> Select Line (Directrix). *Pre-requisite*: Need a line.
4.  **Update `Parabola` Component**: Refactor `useMemo` to calculate points based on the specific definition type (General vs Standard vs Geometric).

*Self-Correction on General Equation*: The user asked for "General Equation". This typically means $Ax^2 + Bxy + Cy^2 + Dx + Ey + F = 0$ for conics, but for parabolas specifically in school context, it often means $y = ax^2+bx+c$. I will support $y = ax^2+bx+c$ and $x = ay^2+by+c$.

*Refined Canvas Interaction*:
*   **Vertex + Focus**:
    *   Step 1: Click -> Create/Select Point (Vertex).
    *   Step 2: Click -> Create/Select Point (Focus).
    *   Action: Create Parabola defined by these two points.
*   **Focus + Directrix**:
    *   Step 1: Click -> Create/Select Point (Focus).
    *   Step 2: Click -> Select Line (Directrix). *Note: Must verify if we can select lines easily.*

Let's start.