import type { GeoElement, LineElement, PointElement } from '../types/geoElements';

// Calculate element properties based on its definition
export function calculateElement(
    element: GeoElement,
    getElement: (id: string) => GeoElement | undefined
): Partial<GeoElement> | null {

    if (element.type === 'point') {
        const def = element.definition;

        if (def.type === 'midpoint') {
            const p1 = getElement(def.p1) as PointElement | undefined;
            const p2 = getElement(def.p2) as PointElement | undefined;

            if (p1 && p2 && p1.type === 'point' && p2.type === 'point') {
                return {
                    x: (p1.x + p2.x) / 2,
                    y: (p1.y + p2.y) / 2
                };
            }
        } else if (def.type === 'perpendicular_point') {
            const line = getElement(def.lineId) as LineElement | undefined;
            const point = getElement(def.pointId) as PointElement | undefined;

            if (line && point && line.type === 'line' && point.type === 'point') {
                const lp1 = getElement(line.p1) as PointElement | undefined;
                const lp2 = getElement(line.p2) as PointElement | undefined;

                if (lp1 && lp2) {
                    const dx = lp2.x - lp1.x;
                    const dy = lp2.y - lp1.y;
                    const len = Math.sqrt(dx * dx + dy * dy);

                    if (len > 1e-6) {
                        // Perpendicular direction (normalized)
                        const perpX = -dy / len;
                        const perpY = dx / len;

                        return {
                            x: point.x + perpX * 50,
                            y: point.y + perpY * 50
                        };
                    }
                }
            }
        }
    } else if (element.type === 'label') {
        const def = element.definition;

        if (def.type === 'distance') {
            const el1 = getElement(def.el1);
            const el2 = getElement(def.el2);

            if (def.type2 === 'point' && el1?.type === 'point' && el2?.type === 'point') {
                const p1 = el1 as PointElement;
                const p2 = el2 as PointElement;
                const dist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);

                // Distance in "units" (assuming PIXELS_PER_UNIT = 50)
                const distInUnits = dist / 50;

                return {
                    text: distInUnits.toFixed(2),
                    x: (p1.x + p2.x) / 2,
                    y: (p1.y + p2.y) / 2 - 20
                };
            }
        }
    } else if (element.type === 'angle') {
        const def = element.definition;

        if (def.type === 'angle_3points') {
            const p1 = getElement(def.p1) as PointElement | undefined;
            const vertex = getElement(def.vertex) as PointElement | undefined;
            const p2 = getElement(def.p2) as PointElement | undefined;

            if (p1 && vertex && p2) {
                const angle1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
                const angle2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);
                let diff = (angle2 - angle1) * 180 / Math.PI;
                if (diff < 0) diff += 360;

                return {
                    angleValue: diff
                } as Partial<GeoElement>;
            }
        }
    }

    return null;
}

// Construction helpers

/**
 * Calculate the perpendicular foot from a point to a line
 */
export function getPerpendicularFoot(
    point: PointElement,
    lineP1: PointElement,
    lineP2: PointElement
): { x: number; y: number } {
    const dx = lineP2.x - lineP1.x;
    const dy = lineP2.y - lineP1.y;
    const len2 = dx * dx + dy * dy;

    if (len2 < 1e-10) {
        return { x: lineP1.x, y: lineP1.y };
    }

    const t = ((point.x - lineP1.x) * dx + (point.y - lineP1.y) * dy) / len2;

    return {
        x: lineP1.x + t * dx,
        y: lineP1.y + t * dy
    };
}

/**
 * Calculate a point on a line parallel to another line, passing through a given point
 */
export function getParallelPoint(
    point: PointElement,
    lineP1: PointElement,
    lineP2: PointElement,
    distance: number = 50
): { x: number; y: number } {
    const dx = lineP2.x - lineP1.x;
    const dy = lineP2.y - lineP1.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len < 1e-6) {
        return { x: point.x + distance, y: point.y };
    }

    // Direction vector (normalized)
    const ux = dx / len;
    const uy = dy / len;

    return {
        x: point.x + ux * distance,
        y: point.y + uy * distance
    };
}

/**
 * Check if an angle is approximately 90 degrees
 */
export function isRightAngle(angleDegrees: number, tolerance: number = 1): boolean {
    const normalized = angleDegrees % 360;
    return Math.abs(normalized - 90) < tolerance ||
        Math.abs(normalized - 270) < tolerance;
}

/**
 * Calculate the incenter of a triangle (intersection of angle bisectors)
 * The incenter is equidistant from all three sides
 */
export function getIncenter(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number }
): { x: number; y: number; inradius: number } {
    // Side lengths
    const a = Math.sqrt((p2.x - p3.x) ** 2 + (p2.y - p3.y) ** 2); // opposite to p1
    const b = Math.sqrt((p1.x - p3.x) ** 2 + (p1.y - p3.y) ** 2); // opposite to p2
    const c = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2); // opposite to p3

    const perimeter = a + b + c;

    if (perimeter < 1e-6) return { x: p1.x, y: p1.y, inradius: 0 };

    // Incenter coordinates (weighted average by opposite side lengths)
    const x = (a * p1.x + b * p2.x + c * p3.x) / perimeter;
    const y = (a * p1.y + b * p2.y + c * p3.y) / perimeter;

    // Calculate area using cross product
    const area = Math.abs((p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y)) / 2;

    // Inradius = area / semi-perimeter
    const inradius = (2 * area) / perimeter;

    return { x, y, inradius };
}

/**
 * Calculate the circumcenter of a triangle (intersection of perpendicular bisectors)
 * The circumcenter is equidistant from all three vertices
 */
export function getCircumcenter(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number }
): { x: number; y: number; circumradius: number } {
    const ax = p1.x, ay = p1.y;
    const bx = p2.x, by = p2.y;
    const cx = p3.x, cy = p3.y;

    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));

    if (Math.abs(d) < 1e-10) {
        // Collinear points, no circumcenter
        return { x: (ax + bx + cx) / 3, y: (ay + by + cy) / 3, circumradius: 0 };
    }

    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;

    const circumradius = Math.sqrt((ux - ax) ** 2 + (uy - ay) ** 2);

    return { x: ux, y: uy, circumradius };
}

/**
 * Calculate tangent points from an external point to a circle
 * Returns two tangent points where tangent lines touch the circle
 */
export function getTangentPoints(
    center: { x: number; y: number },
    radius: number,
    external: { x: number; y: number }
): { t1: { x: number; y: number }; t2: { x: number; y: number } } | null {
    const dx = external.x - center.x;
    const dy = external.y - center.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    // Point must be outside the circle
    if (d <= radius + 1e-6) {
        return null;
    }

    // Distance from external point to tangent point along the line to center
    const a = radius * radius / d;
    // Height of tangent point perpendicular to line from external to center
    const h = Math.sqrt(radius * radius - a * a);

    // Unit vector from center to external point
    const ux = dx / d;
    const uy = dy / d;

    // Point on line from center toward external at distance (radius^2/d)
    const px = center.x + a * ux;
    const py = center.y + a * uy;

    // Perpendicular vector
    const perpX = -uy;
    const perpY = ux;

    return {
        t1: { x: px + h * perpX, y: py + h * perpY },
        t2: { x: px - h * perpX, y: py - h * perpY }
    };
}


