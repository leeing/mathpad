// Core functions for triangle transformation (congruent/similar)

export interface Point2D {
    x: number;
    y: number;
}

export type FlipType = 'none' | 'horizontal' | 'vertical';

/**
 * Calculate the centroid (center of mass) of a triangle
 */
export function getTriangleCentroid(p1: Point2D, p2: Point2D, p3: Point2D): Point2D {
    return {
        x: (p1.x + p2.x + p3.x) / 3,
        y: (p1.y + p2.y + p3.y) / 3
    };
}

/**
 * Transform triangle vertices with scale, rotation, and flip
 * @param points - Original triangle vertices [p1, p2, p3]
 * @param scale - Scale factor (1.0 = congruent, other = similar)
 * @param rotationDeg - Rotation angle in degrees
 * @param flip - Flip type
 * @param targetCenter - Where to place the transformed triangle's centroid
 */
export function transformTriangle(
    points: [Point2D, Point2D, Point2D],
    scale: number,
    rotationDeg: number,
    flip: FlipType,
    targetCenter: Point2D
): [Point2D, Point2D, Point2D] {
    const [p1, p2, p3] = points;

    // Calculate original centroid
    const centroid = getTriangleCentroid(p1, p2, p3);

    // Convert rotation to radians
    const rotation = (rotationDeg * Math.PI) / 180;

    // Transform each vertex
    const transformPoint = (p: Point2D): Point2D => {
        // 1. Translate to origin (relative to centroid)
        let x = p.x - centroid.x;
        let y = p.y - centroid.y;

        // 2. Apply flip
        if (flip === 'horizontal') {
            x = -x;
        } else if (flip === 'vertical') {
            y = -y;
        }

        // 3. Apply scale
        x *= scale;
        y *= scale;

        // 4. Apply rotation
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        const rotatedX = x * cos - y * sin;
        const rotatedY = x * sin + y * cos;

        // 5. Translate to target center
        return {
            x: rotatedX + targetCenter.x,
            y: rotatedY + targetCenter.y
        };
    };

    return [
        transformPoint(p1),
        transformPoint(p2),
        transformPoint(p3)
    ];
}

/**
 * Get the bounding box of triangle points
 */
export function getTriangleBounds(p1: Point2D, p2: Point2D, p3: Point2D): {
    minX: number; maxX: number; minY: number; maxY: number;
} {
    return {
        minX: Math.min(p1.x, p2.x, p3.x),
        maxX: Math.max(p1.x, p2.x, p3.x),
        minY: Math.min(p1.y, p2.y, p3.y),
        maxY: Math.max(p1.y, p2.y, p3.y)
    };
}
