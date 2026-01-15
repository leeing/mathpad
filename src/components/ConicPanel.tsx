import React, { useState } from 'react';
import { useToolStore } from '../store/toolStore';
import { useGeoStore } from '../store/geoStore';
import { useViewStore } from '../store/viewStore';
import { generateId } from '../utils/id';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';

type EllipseMode = 'foci' | 'center' | 'equation';
type ParabolaMode = 'focus_directrix' | 'vertex_focus' | 'equation';

export const ConicPanel: React.FC = () => {
    const activeTool = useToolStore((state) => state.activeTool);
    const addElement = useGeoStore((state) => state.addElement);
    const darkTheme = useViewStore((state) => state.darkTheme);

    const [isCollapsed, setIsCollapsed] = useState(false);

    // Ellipse state
    const [ellipseMode, setEllipseMode] = useState<EllipseMode>('equation');
    const [ellipseA, setEllipseA] = useState('3');
    const [ellipseB, setEllipseB] = useState('2');

    // Parabola state
    const [parabolaMode, setParabolaMode] = useState<ParabolaMode>('equation');
    const [parabolaP, setParabolaP] = useState('1');
    const [parabolaDirection, setParabolaDirection] = useState<'up' | 'down' | 'left' | 'right'>('up');

    // Only show for ellipse or parabola tools
    if (activeTool !== 'ellipse' && activeTool !== 'parabola') {
        return null;
    }

    const handleAddEllipse = () => {
        if (ellipseMode !== 'equation') return; // Other modes handled by canvas clicks

        const a = parseFloat(ellipseA) || 3;
        const b = parseFloat(ellipseB) || 2;

        addElement({
            id: generateId(),
            type: 'ellipse',
            name: `椭圆 (a=${a}, b=${b})`,
            visible: true,
            style: { stroke: '#000', strokeWidth: 2 },
            dependencies: [],
            centerX: 0, // At origin
            centerY: 0,
            a: a,
            b: b,
            rotation: 0,
            definition: { type: 'ellipse_by_equation', a, b }
        } as any);
    };

    const handleAddParabola = () => {
        if (parabolaMode !== 'equation') return;

        const p = parseFloat(parabolaP) || 1;

        addElement({
            id: generateId(),
            type: 'parabola',
            name: `抛物线 (p=${p})`,
            visible: true,
            style: { stroke: '#000', strokeWidth: 2 },
            dependencies: [],
            vertexX: 0, // At origin
            vertexY: 0,
            p: p,
            direction: parabolaDirection,
            definition: { type: 'parabola_by_equation', p, direction: parabolaDirection }
        } as any);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (activeTool === 'ellipse') handleAddEllipse();
            else if (activeTool === 'parabola') handleAddParabola();
        }
    };

    const title = activeTool === 'ellipse' ? '椭圆' : '抛物线';

    return (
        <div className={clsx(
            "absolute left-4 bottom-14 rounded-lg shadow-lg w-72 z-10",
            darkTheme ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800"
        )}>
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
                                    标准方程 x²/a² + y²/b² = 1
                                </label>
                            </div>

                            {ellipseMode === 'equation' && (
                                <div className="flex gap-2 items-center">
                                    <span className="text-sm">a=</span>
                                    <input
                                        type="number"
                                        value={ellipseA}
                                        onChange={(e) => setEllipseA(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className={clsx(
                                            "border rounded px-2 py-1 w-16 text-sm",
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
                                            "border rounded px-2 py-1 w-16 text-sm",
                                            darkTheme ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                                        )}
                                    />
                                    <button
                                        onClick={handleAddEllipse}
                                        className="bg-blue-500 text-white rounded p-1.5 hover:bg-blue-600"
                                        title="添加椭圆"
                                    >
                                        <Plus size={16} />
                                    </button>
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
                                            onChange={(e) => setParabolaDirection(e.target.value as any)}
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

                            {parabolaMode !== 'equation' && (
                                <p className={clsx("text-xs", darkTheme ? "text-gray-400" : "text-gray-500")}>
                                    请在画布上点击选择点
                                </p>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
