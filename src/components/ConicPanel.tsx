import React, { useState } from 'react';
import { useToolStore } from '../store/toolStore';
import { useGeoStore } from '../store/geoStore';
import { useViewStore } from '../store/viewStore';
import { generateId } from '../utils/id';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';
import { PIXELS_PER_UNIT } from '../constants/grid';
import type { EllipseElement, HyperbolaElement, LineElement, ParabolaElement, PointElement } from '../types/geoElements';

export const ConicPanel: React.FC = () => {
    const activeTool = useToolStore((state) => state.activeTool);
    const ellipseMode = useToolStore((state) => state.ellipseMode);
    const setEllipseMode = useToolStore((state) => state.setEllipseMode);
    const parabolaMode = useToolStore((state) => state.parabolaMode);
    const setParabolaMode = useToolStore((state) => state.setParabolaMode);
    const addElement = useGeoStore((state) => state.addElement);
    const darkTheme = useViewStore((state) => state.darkTheme);
    const viewSize = useViewStore((state) => state.size);

    const [isCollapsed, setIsCollapsed] = useState(false);

    // Ellipse state
    const [ellipseA, setEllipseA] = useState('3');
    const [ellipseB, setEllipseB] = useState('2');
    const [ellipseCenterX, setEllipseCenterX] = useState('0');
    const [ellipseCenterY, setEllipseCenterY] = useState('0');
    const [ellipseRotation, setEllipseRotation] = useState('0');  // Rotation in degrees

    // Parabola state
    const [parabolaP, setParabolaP] = useState('1');
    const [parabolaDirection, setParabolaDirection] = useState<'up' | 'down' | 'left' | 'right'>('up');
    const [parabolaGeneralA, setParabolaGeneralA] = useState('1');
    const [parabolaGeneralB, setParabolaGeneralB] = useState('0');
    const [parabolaGeneralC, setParabolaGeneralC] = useState('0');
    const [parabolaGeneralAxis, setParabolaGeneralAxis] = useState<'x' | 'y'>('y'); // y = ax^2+...
    const [parabolaVFVertexX, setParabolaVFVertexX] = useState('0');
    const [parabolaVFVertexY, setParabolaVFVertexY] = useState('0');
    const [parabolaVFFocusX, setParabolaVFFocusX] = useState('1');
    const [parabolaVFFocusY, setParabolaVFFocusY] = useState('0');
    const [parabolaFDFocusX, setParabolaFDFocusX] = useState('1');
    const [parabolaFDFocusY, setParabolaFDFocusY] = useState('0');
    const [parabolaDirectrixA, setParabolaDirectrixA] = useState('1');
    const [parabolaDirectrixB, setParabolaDirectrixB] = useState('0');
    const [parabolaDirectrixC, setParabolaDirectrixC] = useState('0');

    const [hyperbolaA, setHyperbolaA] = useState('3');
    const [hyperbolaB, setHyperbolaB] = useState('2');
    const [hyperbolaCenterX, setHyperbolaCenterX] = useState('0');
    const [hyperbolaCenterY, setHyperbolaCenterY] = useState('0');
    const [hyperbolaOrientation, setHyperbolaOrientation] = useState<'horizontal' | 'vertical'>('horizontal');

    if (activeTool !== 'ellipse' && activeTool !== 'parabola' && activeTool !== 'hyperbola') {
        return null;
    }

    const handleAddEllipse = () => {
        if (ellipseMode !== 'equation') return; // Other modes handled by canvas clicks

        const a = parseFloat(ellipseA) || 3;
        const b = parseFloat(ellipseB) || 2;
        const centerX = parseFloat(ellipseCenterX) || 0;
        const centerY = parseFloat(ellipseCenterY) || 0;
        const rotationDeg = parseFloat(ellipseRotation) || 0;
        const rotation = (rotationDeg * Math.PI) / 180;  // Convert to radians

        const ellipseEl: EllipseElement = {
            id: generateId(),
            type: 'ellipse',
            name: `椭圆`,
            visible: true,
            style: { stroke: '#000', strokeWidth: 1.5 },
            dependencies: [],
            centerX,
            centerY,
            a,
            b,
            rotation,
            definition: { type: 'ellipse_by_equation', a, b, centerX, centerY, rotation }
        };
        addElement(ellipseEl);
    };

    const handleAddParabola = () => {
        if (parabolaMode === 'equation') {
            const p = parseFloat(parabolaP) || 1;

            const parabolaEl: ParabolaElement = {
                id: generateId(),
                type: 'parabola',
                name: `抛物线 (p=${p})`,
                visible: true,
                style: { stroke: '#000', strokeWidth: 1.5 },
                dependencies: [],
                vertexX: 0, // At origin
                vertexY: 0,
                p: p,
                direction: parabolaDirection,
                definition: { type: 'parabola_by_equation', p, direction: parabolaDirection }
            };
            addElement(parabolaEl);
        } else if (parabolaMode === 'general_equation') {
            const a = parseFloat(parabolaGeneralA) || 1;
            const b = parseFloat(parabolaGeneralB) || 0;
            const c = parseFloat(parabolaGeneralC) || 0;

            // Calculate vertex and p for standard form display/reference if needed
            // For y = ax^2 + bx + c:
            // Vertex x = -b/(2a), y = c - b^2/(4a)
            // p = 1/(4|a|)

            let vertexX = 0, vertexY = 0, p = 0;
            if (parabolaGeneralAxis === 'y') {
                vertexX = -b / (2 * a);
                vertexY = c - (b * b) / (4 * a);
                p = 1 / (4 * Math.abs(a));
            } else {
                vertexY = -b / (2 * a);
                vertexX = c - (b * b) / (4 * a);
                p = 1 / (4 * Math.abs(a));
            }

            const parabolaEl: ParabolaElement = {
                id: generateId(),
                type: 'parabola',
                name: `抛物线 (${parabolaGeneralAxis === 'y' ? 'y' : 'x'} = ${a}${parabolaGeneralAxis === 'y' ? 'x' : 'y'}²...)`,
                visible: true,
                style: { stroke: '#000', strokeWidth: 1.5 },
                dependencies: [],
                vertexX,
                vertexY,
                p,
                // Direction depends on 'a' sign and axis
                // y=ax^2: a>0 up, a<0 down
                // x=ay^2: a>0 right, a<0 left
                direction: parabolaGeneralAxis === 'y'
                    ? (a > 0 ? 'up' : 'down')
                    : (a > 0 ? 'right' : 'left'),
                a, b, c, axis: parabolaGeneralAxis,
                definition: { type: 'parabola_general', a, b, c, axis: parabolaGeneralAxis }
            };
            addElement(parabolaEl);
        } else if (parabolaMode === 'vertex_focus') {
            const vx = parseFloat(parabolaVFVertexX);
            const vy = parseFloat(parabolaVFVertexY);
            const fx = parseFloat(parabolaVFFocusX);
            const fy = parseFloat(parabolaVFFocusY);

            if (![vx, vy, fx, fy].every((n) => Number.isFinite(n))) return;

            const vId = generateId();
            const fId = generateId();

            const vPx = vx * PIXELS_PER_UNIT;
            const vPy = -vy * PIXELS_PER_UNIT;
            const fPx = fx * PIXELS_PER_UNIT;
            const fPy = -fy * PIXELS_PER_UNIT;

            const dx = fPx - vPx;
            const dy = fPy - vPy;
            if (Math.sqrt(dx * dx + dy * dy) < 1) return;

            const vertexPoint: PointElement = {
                id: vId,
                type: 'point',
                name: 'V',
                x: vPx,
                y: vPy,
                visible: true,
                style: { stroke: '#2563eb', strokeWidth: 1.5, fill: '#3b82f6' },
                dependencies: [],
                definition: { type: 'free' }
            };
            addElement(vertexPoint);

            const focusPoint: PointElement = {
                id: fId,
                type: 'point',
                name: 'F',
                x: fPx,
                y: fPy,
                visible: true,
                style: { stroke: '#2563eb', strokeWidth: 1.5, fill: '#3b82f6' },
                dependencies: [],
                definition: { type: 'free' }
            };
            addElement(focusPoint);

            const parabolaEl: ParabolaElement = {
                id: generateId(),
                type: 'parabola',
                name: 'parabola',
                visible: true,
                style: { stroke: '#000', strokeWidth: 1.5 },
                dependencies: [vId, fId],
                definition: { type: 'parabola_by_vertex_focus', vertex: vId, focus: fId }
            };
            addElement(parabolaEl);
        } else if (parabolaMode === 'focus_directrix') {
            const fx = parseFloat(parabolaFDFocusX);
            const fy = parseFloat(parabolaFDFocusY);
            const a = parseFloat(parabolaDirectrixA);
            const b = parseFloat(parabolaDirectrixB);
            const c = parseFloat(parabolaDirectrixC);

            if (![fx, fy, a, b, c].every((n) => Number.isFinite(n))) return;
            if (Math.abs(a) < 1e-12 && Math.abs(b) < 1e-12) return;

            const focusId = generateId();
            const dP1Id = generateId();
            const dP2Id = generateId();
            const directrixId = generateId();

            const focusPx = fx * PIXELS_PER_UNIT;
            const focusPy = -fy * PIXELS_PER_UNIT;

            const makeMathPoint = (x: number, y: number) => ({ x: x * PIXELS_PER_UNIT, y: -y * PIXELS_PER_UNIT });

            let p1m: { x: number; y: number };
            let p2m: { x: number; y: number };

            if (Math.abs(b) > 1e-12) {
                const x1 = -10;
                const x2 = 10;
                const y1 = (-a * x1 - c) / b;
                const y2 = (-a * x2 - c) / b;
                p1m = makeMathPoint(x1, y1);
                p2m = makeMathPoint(x2, y2);
            } else {
                const x = (-c) / a;
                const y1 = -10;
                const y2 = 10;
                p1m = makeMathPoint(x, y1);
                p2m = makeMathPoint(x, y2);
            }

            const dx = p2m.x - p1m.x;
            const dy = p2m.y - p1m.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len < 1) return;

            const nx = -dy / len;
            const ny = dx / len;
            const dist = Math.abs((focusPx - p1m.x) * nx + (focusPy - p1m.y) * ny);
            if (dist < 1) return;

            const focusPoint: PointElement = {
                id: focusId,
                type: 'point',
                name: 'F',
                x: focusPx,
                y: focusPy,
                visible: true,
                style: { stroke: '#2563eb', strokeWidth: 1.5, fill: '#3b82f6' },
                dependencies: [],
                definition: { type: 'free' }
            };
            addElement(focusPoint);

            const dP1: PointElement = {
                id: dP1Id,
                type: 'point',
                name: 'D1',
                x: p1m.x,
                y: p1m.y,
                visible: false,
                style: { stroke: '#6b7280', strokeWidth: 1.5, fill: '#6b7280' },
                dependencies: [],
                definition: { type: 'free' }
            };
            addElement(dP1);

            const dP2: PointElement = {
                id: dP2Id,
                type: 'point',
                name: 'D2',
                x: p2m.x,
                y: p2m.y,
                visible: false,
                style: { stroke: '#6b7280', strokeWidth: 1.5, fill: '#6b7280' },
                dependencies: [],
                definition: { type: 'free' }
            };
            addElement(dP2);

            const directrix: LineElement = {
                id: directrixId,
                type: 'line',
                subtype: 'line',
                name: 'directrix',
                visible: true,
                style: { stroke: '#6b7280', strokeWidth: 1, dash: [6, 4] },
                dependencies: [dP1Id, dP2Id],
                definition: { type: 'line_from_points', p1: dP1Id, p2: dP2Id },
                p1: dP1Id,
                p2: dP2Id
            };
            addElement(directrix);

            const parabolaEl: ParabolaElement = {
                id: generateId(),
                type: 'parabola',
                name: 'parabola',
                visible: true,
                style: { stroke: '#000', strokeWidth: 1.5 },
                dependencies: [focusId, directrixId],
                definition: { type: 'parabola_by_focus_directrix', focus: focusId, directrix: directrixId }
            };
            addElement(parabolaEl);
        }
    };

    const handleAddHyperbola = () => {
        const a = parseFloat(hyperbolaA);
        const b = parseFloat(hyperbolaB);
        const centerX = parseFloat(hyperbolaCenterX);
        const centerY = parseFloat(hyperbolaCenterY);
        if (![a, b, centerX, centerY].every((n) => Number.isFinite(n))) return;
        if (a <= 0 || b <= 0) return;

        const hyperbolaEl: HyperbolaElement = {
            id: generateId(),
            type: 'hyperbola',
            name: '双曲线',
            visible: true,
            style: { stroke: '#000', strokeWidth: 1.5 },
            dependencies: [],
            a,
            b,
            centerX,
            centerY,
            orientation: hyperbolaOrientation,
            definition: { type: 'hyperbola_by_equation', a, b, centerX, centerY, orientation: hyperbolaOrientation },
        };

        addElement(hyperbolaEl);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (activeTool === 'ellipse') handleAddEllipse();
            else if (activeTool === 'parabola') handleAddParabola();
            else if (activeTool === 'hyperbola') handleAddHyperbola();
        }
    };

    const title = activeTool === 'ellipse' ? '椭圆' : activeTool === 'parabola' ? '抛物线' : '双曲线';

    // Position panel to the right of toolbar, vertically centered
    const panelTop = Math.max(60, viewSize.height / 2 - 150);  // Center vertically, min 60px from top

    return (
        <div
            className={clsx(
                "absolute rounded-lg shadow-lg w-72 z-10",
                darkTheme ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800"
            )}
            style={{ left: 90, top: panelTop }}
        >
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={clsx(
                    "w-full flex items-center justify-between p-3 rounded-lg",
                    darkTheme ? "hover:bg-gray-700" : "hover:bg-gray-50"
                )}
            >
                <span className="font-bold text-sm">{title}</span>
                {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {!isCollapsed && (
                <div className="p-3 pt-0">
                    {activeTool === 'ellipse' && (
                        <>
                            <div className="space-y-2 mb-3">
                                <label className={clsx("flex items-center gap-2 text-sm cursor-pointer", darkTheme ? "hover:bg-gray-700" : "hover:bg-gray-50", "p-1 rounded")}>
                                    <input
                                        type="radio"
                                        name="ellipseMode"
                                        checked={ellipseMode === 'foci'}
                                        onChange={() => setEllipseMode('foci')}
                                        className="accent-blue-500"
                                    />
                                    两焦点 + 椭圆上一点
                                </label>
                                <label className={clsx("flex items-center gap-2 text-sm cursor-pointer", darkTheme ? "hover:bg-gray-700" : "hover:bg-gray-50", "p-1 rounded")}>
                                    <input
                                        type="radio"
                                        name="ellipseMode"
                                        checked={ellipseMode === 'center'}
                                        onChange={() => setEllipseMode('center')}
                                        className="accent-blue-500"
                                    />
                                    中心 + 长短轴端点
                                </label>
                                <label className={clsx("flex items-center gap-2 text-sm cursor-pointer", darkTheme ? "hover:bg-gray-700" : "hover:bg-gray-50", "p-1 rounded")}>
                                    <input
                                        type="radio"
                                        name="ellipseMode"
                                        checked={ellipseMode === 'equation'}
                                        onChange={() => setEllipseMode('equation')}
                                        className="accent-blue-500"
                                    />
                                    一般方程 (可指定中心和旋转)
                                </label>
                            </div>

                            {ellipseMode === 'equation' && (
                                <div className="space-y-2">
                                    <div className="flex gap-2 items-center">
                                        <span className="text-sm">a=</span>
                                        <input
                                            type="number"
                                            value={ellipseA}
                                            onChange={(e) => setEllipseA(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            className={clsx(
                                                "border rounded px-2 py-1 w-14 text-sm",
                                                darkTheme ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                                            )}
                                        />
                                        <span className="text-sm">b=</span>
                                        <input
                                            type="number"
                                            value={ellipseB}
                                            onChange={(e) => setEllipseB(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            className={clsx(
                                                "border rounded px-2 py-1 w-14 text-sm",
                                                darkTheme ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                                            )}
                                        />
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <span className="text-sm">中心</span>
                                        <span className="text-sm">(</span>
                                        <input
                                            type="number"
                                            value={ellipseCenterX}
                                            onChange={(e) => setEllipseCenterX(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="h"
                                            className={clsx(
                                                "border rounded px-2 py-1 w-12 text-sm",
                                                darkTheme ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                                            )}
                                        />
                                        <span className="text-sm">,</span>
                                        <input
                                            type="number"
                                            value={ellipseCenterY}
                                            onChange={(e) => setEllipseCenterY(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="k"
                                            className={clsx(
                                                "border rounded px-2 py-1 w-12 text-sm",
                                                darkTheme ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                                            )}
                                        />
                                        <span className="text-sm">)</span>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <span className="text-sm">旋转</span>
                                        <input
                                            type="number"
                                            value={ellipseRotation}
                                            onChange={(e) => setEllipseRotation(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            className={clsx(
                                                "border rounded px-2 py-1 w-14 text-sm",
                                                darkTheme ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                                            )}
                                        />
                                        <span className="text-xs text-gray-500">°</span>
                                        <button
                                            onClick={handleAddEllipse}
                                            className="bg-blue-500 text-white rounded p-1.5 hover:bg-blue-600 ml-auto"
                                            title="添加椭圆"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {ellipseMode !== 'equation' && (
                                <p className={clsx("text-xs", darkTheme ? "text-gray-400" : "text-gray-500")}>
                                    请在画布上点击选择点
                                </p>
                            )}
                        </>
                    )}

                    {activeTool === 'parabola' && (
                        <>
                            <div className="space-y-2 mb-3">
                                <label className={clsx("flex items-center gap-2 text-sm cursor-pointer", darkTheme ? "hover:bg-gray-700" : "hover:bg-gray-50", "p-1 rounded")}>
                                    <input
                                        type="radio"
                                        name="parabolaMode"
                                        checked={parabolaMode === 'focus_directrix'}
                                        onChange={() => setParabolaMode('focus_directrix')}
                                        className="accent-blue-500"
                                    />
                                    焦点 + 准线
                                </label>
                                <label className={clsx("flex items-center gap-2 text-sm cursor-pointer", darkTheme ? "hover:bg-gray-700" : "hover:bg-gray-50", "p-1 rounded")}>
                                    <input
                                        type="radio"
                                        name="parabolaMode"
                                        checked={parabolaMode === 'vertex_focus'}
                                        onChange={() => setParabolaMode('vertex_focus')}
                                        className="accent-blue-500"
                                    />
                                    顶点 + 焦点
                                </label>
                                <label className={clsx("flex items-center gap-2 text-sm cursor-pointer", darkTheme ? "hover:bg-gray-700" : "hover:bg-gray-50", "p-1 rounded")}>
                                    <input
                                        type="radio"
                                        name="parabolaMode"
                                        checked={parabolaMode === 'equation'}
                                        onChange={() => setParabolaMode('equation')}
                                        className="accent-blue-500"
                                    />
                                    标准方程 (顶点在原点)
                                </label>
                                <label className={clsx("flex items-center gap-2 text-sm cursor-pointer", darkTheme ? "hover:bg-gray-700" : "hover:bg-gray-50", "p-1 rounded")}>
                                    <input
                                        type="radio"
                                        name="parabolaMode"
                                        checked={parabolaMode === 'general_equation'}
                                        onChange={() => setParabolaMode('general_equation')}
                                        className="accent-blue-500"
                                    />
                                    一般方程 (y = ax² + bx + c)
                                </label>
                            </div>

                            {parabolaMode === 'equation' && (
                                <div className="space-y-2">
                                    <div className="flex gap-2 items-center">
                                        <span className="text-sm">p=</span>
                                        <input
                                            type="number"
                                            value={parabolaP}
                                            onChange={(e) => setParabolaP(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            className={clsx(
                                                "border rounded px-2 py-1 w-16 text-sm",
                                                darkTheme ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                                            )}
                                        />
                                        <span className="text-xs text-gray-500">(焦距)</span>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <span className="text-sm">方向:</span>
                                        <select
                                            value={parabolaDirection}
                                            onChange={(e) => setParabolaDirection(e.target.value as 'up' | 'down' | 'left' | 'right')}
                                            className={clsx(
                                                "border rounded px-2 py-1 text-sm",
                                                darkTheme ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                                            )}
                                        >
                                            <option value="up">向上 (x²=4py)</option>
                                            <option value="down">向下 (x²=-4py)</option>
                                            <option value="right">向右 (y²=4px)</option>
                                            <option value="left">向左 (y²=-4px)</option>
                                        </select>
                                        <button
                                            onClick={handleAddParabola}
                                            className="bg-blue-500 text-white rounded p-1.5 hover:bg-blue-600"
                                            title="添加抛物线"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {parabolaMode === 'vertex_focus' && (
                                <div className="space-y-2">
                                    <div className="flex gap-2 items-center">
                                        <span className="text-sm">V(</span>
                                        <input
                                            type="number"
                                            value={parabolaVFVertexX}
                                            onChange={(e) => setParabolaVFVertexX(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            className={clsx(
                                                "border rounded px-2 py-1 w-14 text-sm",
                                                darkTheme ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                                            )}
                                        />
                                        <span className="text-sm">,</span>
                                        <input
                                            type="number"
                                            value={parabolaVFVertexY}
                                            onChange={(e) => setParabolaVFVertexY(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            className={clsx(
                                                "border rounded px-2 py-1 w-14 text-sm",
                                                darkTheme ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                                            )}
                                        />
                                        <span className="text-sm">)</span>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <span className="text-sm">F(</span>
                                        <input
                                            type="number"
                                            value={parabolaVFFocusX}
                                            onChange={(e) => setParabolaVFFocusX(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            className={clsx(
                                                "border rounded px-2 py-1 w-14 text-sm",
                                                darkTheme ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                                            )}
                                        />
                                        <span className="text-sm">,</span>
                                        <input
                                            type="number"
                                            value={parabolaVFFocusY}
                                            onChange={(e) => setParabolaVFFocusY(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            className={clsx(
                                                "border rounded px-2 py-1 w-14 text-sm",
                                                darkTheme ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                                            )}
                                        />
                                        <span className="text-sm">)</span>
                                        <button
                                            onClick={handleAddParabola}
                                            className="bg-blue-500 text-white rounded p-1.5 hover:bg-blue-600 ml-auto"
                                            title="生成抛物线"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {parabolaMode === 'focus_directrix' && (
                                <div className="space-y-2">
                                    <div className="flex gap-2 items-center">
                                        <span className="text-sm">F(</span>
                                        <input
                                            type="number"
                                            value={parabolaFDFocusX}
                                            onChange={(e) => setParabolaFDFocusX(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            className={clsx(
                                                "border rounded px-2 py-1 w-14 text-sm",
                                                darkTheme ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                                            )}
                                        />
                                        <span className="text-sm">,</span>
                                        <input
                                            type="number"
                                            value={parabolaFDFocusY}
                                            onChange={(e) => setParabolaFDFocusY(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            className={clsx(
                                                "border rounded px-2 py-1 w-14 text-sm",
                                                darkTheme ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                                            )}
                                        />
                                        <span className="text-sm">)</span>
                                    </div>
                                    <div className="flex gap-2 items-center text-sm">
                                        <span className="text-sm">ax+by+c=0</span>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <span className="text-sm">a=</span>
                                        <input
                                            type="number"
                                            value={parabolaDirectrixA}
                                            onChange={(e) => setParabolaDirectrixA(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            className={clsx(
                                                "border rounded px-2 py-1 w-14 text-sm",
                                                darkTheme ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                                            )}
                                        />
                                        <span className="text-sm">b=</span>
                                        <input
                                            type="number"
                                            value={parabolaDirectrixB}
                                            onChange={(e) => setParabolaDirectrixB(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            className={clsx(
                                                "border rounded px-2 py-1 w-14 text-sm",
                                                darkTheme ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                                            )}
                                        />
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <span className="text-sm">c=</span>
                                        <input
                                            type="number"
                                            value={parabolaDirectrixC}
                                            onChange={(e) => setParabolaDirectrixC(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            className={clsx(
                                                "border rounded px-2 py-1 w-14 text-sm",
                                                darkTheme ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                                            )}
                                        />
                                        <button
                                            onClick={handleAddParabola}
                                            className="bg-blue-500 text-white rounded p-1.5 hover:bg-blue-600 ml-auto"
                                            title="生成抛物线"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {parabolaMode === 'general_equation' && (
                                <div className="space-y-2">
                                    <div className="flex gap-2 items-center text-sm mb-1">
                                        <label className="flex items-center gap-1">
                                            <input
                                                type="radio"
                                                checked={parabolaGeneralAxis === 'y'}
                                                onChange={() => setParabolaGeneralAxis('y')}
                                            /> y = ...
                                        </label>
                                        <label className="flex items-center gap-1">
                                            <input
                                                type="radio"
                                                checked={parabolaGeneralAxis === 'x'}
                                                onChange={() => setParabolaGeneralAxis('x')}
                                            /> x = ...
                                        </label>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <span className="text-sm">a=</span>
                                        <input
                                            type="number"
                                            value={parabolaGeneralA}
                                            onChange={(e) => setParabolaGeneralA(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            className={clsx(
                                                "border rounded px-2 py-1 w-14 text-sm",
                                                darkTheme ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                                            )}
                                        />
                                        <span className="text-sm">b=</span>
                                        <input
                                            type="number"
                                            value={parabolaGeneralB}
                                            onChange={(e) => setParabolaGeneralB(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            className={clsx(
                                                "border rounded px-2 py-1 w-14 text-sm",
                                                darkTheme ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                                            )}
                                        />
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <span className="text-sm">c=</span>
                                        <input
                                            type="number"
                                            value={parabolaGeneralC}
                                            onChange={(e) => setParabolaGeneralC(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            className={clsx(
                                                "border rounded px-2 py-1 w-14 text-sm",
                                                darkTheme ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                                            )}
                                        />
                                        <button
                                            onClick={handleAddParabola}
                                            className="bg-blue-500 text-white rounded p-1.5 hover:bg-blue-600 ml-auto"
                                            title="添加抛物线"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {(parabolaMode !== 'equation' && parabolaMode !== 'general_equation' && parabolaMode !== 'vertex_focus' && parabolaMode !== 'focus_directrix') && (
                                <p className={clsx("text-xs", darkTheme ? "text-gray-400" : "text-gray-500")}>
                                    请在画布上点击选择点
                                </p>
                            )}
                        </>
                    )}

                    {activeTool === 'hyperbola' && (
                        <>
                            <div className="space-y-2 mb-3">
                                <div className="flex gap-2 items-center">
                                    <span className="text-sm">a=</span>
                                    <input
                                        type="number"
                                        value={hyperbolaA}
                                        onChange={(e) => setHyperbolaA(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className={clsx(
                                            "border rounded px-2 py-1 w-14 text-sm",
                                            darkTheme ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                                        )}
                                    />
                                    <span className="text-sm">b=</span>
                                    <input
                                        type="number"
                                        value={hyperbolaB}
                                        onChange={(e) => setHyperbolaB(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className={clsx(
                                            "border rounded px-2 py-1 w-14 text-sm",
                                            darkTheme ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                                        )}
                                    />
                                </div>

                                <div className="flex gap-2 items-center">
                                    <span className="text-sm">中心</span>
                                    <span className="text-sm">(</span>
                                    <input
                                        type="number"
                                        value={hyperbolaCenterX}
                                        onChange={(e) => setHyperbolaCenterX(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className={clsx(
                                            "border rounded px-2 py-1 w-14 text-sm",
                                            darkTheme ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                                        )}
                                    />
                                    <span className="text-sm">,</span>
                                    <input
                                        type="number"
                                        value={hyperbolaCenterY}
                                        onChange={(e) => setHyperbolaCenterY(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className={clsx(
                                            "border rounded px-2 py-1 w-14 text-sm",
                                            darkTheme ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                                        )}
                                    />
                                    <span className="text-sm">)</span>
                                </div>

                                <div className="flex gap-2 items-center">
                                    <span className="text-sm">方向</span>
                                    <select
                                        value={hyperbolaOrientation}
                                        onChange={(e) => setHyperbolaOrientation(e.target.value as 'horizontal' | 'vertical')}
                                        className={clsx(
                                            "border rounded px-2 py-1 text-sm flex-1",
                                            darkTheme ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                                        )}
                                    >
                                        <option value="horizontal">左右开口：x²/a² - y²/b² = 1</option>
                                        <option value="vertical">上下开口：y²/a² - x²/b² = 1</option>
                                    </select>
                                    <button
                                        onClick={handleAddHyperbola}
                                        className="bg-blue-500 text-white rounded p-1.5 hover:bg-blue-600"
                                        title="添加双曲线"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
