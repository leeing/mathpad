import React, { useState } from 'react';
import { useToolStore } from '../store/toolStore';
import { useGeoStore } from '../store/geoStore';
import { useViewStore } from '../store/viewStore';
import { generateId } from '../utils/id';
import { ChevronDown, ChevronUp, Triangle, Square, Pentagon, Hexagon, Circle as CircleIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { PIXELS_PER_UNIT } from '../constants/grid';

interface Template {
    id: string;
    name: string;
    icon: React.ReactNode;
    description: string;
    create: () => void;
}

export const TemplatePanel: React.FC = () => {
    const activeTool = useToolStore((state) => state.activeTool);
    const addElement = useGeoStore((state) => state.addElement);
    const darkTheme = useViewStore((state) => state.darkTheme);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Only show when template tool is active
    if (activeTool !== 'template') {
        return null;
    }

    // Helper function to create a point
    const createPoint = (name: string, x: number, y: number) => {
        const id = generateId();
        addElement({
            id,
            type: 'point',
            name,
            x: x * PIXELS_PER_UNIT,
            y: -y * PIXELS_PER_UNIT, // Flip Y for math convention
            visible: true,
            style: { stroke: '#2563eb', strokeWidth: 2, fill: '#3b82f6' },
            dependencies: [],
            definition: { type: 'free' }
        } as any);
        return id;
    };

    // Helper function to create a line segment
    const createLine = (name: string, p1: string, p2: string) => {
        addElement({
            id: generateId(),
            type: 'line',
            subtype: 'segment',
            name,
            visible: true,
            style: { stroke: '#000', strokeWidth: 2 },
            dependencies: [p1, p2],
            definition: { type: 'line_from_points', p1, p2 },
            p1,
            p2
        } as any);
    };

    // Triangle template
    const createTriangle = () => {
        const A = createPoint('A', -2, -1);
        const B = createPoint('B', 2, -1);
        const C = createPoint('C', 0, 2);
        createLine('AB', A, B);
        createLine('BC', B, C);
        createLine('CA', C, A);
    };

    // Right triangle template
    const createRightTriangle = () => {
        const A = createPoint('A', -2, -1);
        const B = createPoint('B', 2, -1);
        const C = createPoint('C', -2, 2);
        createLine('AB', A, B);
        createLine('BC', B, C);
        createLine('CA', C, A);
    };

    // Isosceles triangle template
    const createIsoscelesTriangle = () => {
        const A = createPoint('A', -2, -1);
        const B = createPoint('B', 2, -1);
        const C = createPoint('C', 0, 2.46); // Height to make sides equal
        createLine('AB', A, B);
        createLine('BC', B, C);
        createLine('CA', C, A);
    };

    // Equilateral triangle template
    const createEquilateralTriangle = () => {
        const h = Math.sqrt(3); // Height of equilateral triangle with side 2
        const A = createPoint('A', -1, -h / 3);
        const B = createPoint('B', 1, -h / 3);
        const C = createPoint('C', 0, 2 * h / 3);
        createLine('AB', A, B);
        createLine('BC', B, C);
        createLine('CA', C, A);
    };

    // Square template
    const createSquare = () => {
        const A = createPoint('A', -1.5, -1.5);
        const B = createPoint('B', 1.5, -1.5);
        const C = createPoint('C', 1.5, 1.5);
        const D = createPoint('D', -1.5, 1.5);
        createLine('AB', A, B);
        createLine('BC', B, C);
        createLine('CD', C, D);
        createLine('DA', D, A);
    };

    // Rectangle template
    const createRectangle = () => {
        const A = createPoint('A', -2, -1);
        const B = createPoint('B', 2, -1);
        const C = createPoint('C', 2, 1);
        const D = createPoint('D', -2, 1);
        createLine('AB', A, B);
        createLine('BC', B, C);
        createLine('CD', C, D);
        createLine('DA', D, A);
    };

    // Parallelogram template
    const createParallelogram = () => {
        const A = createPoint('A', -2, -1);
        const B = createPoint('B', 1, -1);
        const C = createPoint('C', 2, 1);
        const D = createPoint('D', -1, 1);
        createLine('AB', A, B);
        createLine('BC', B, C);
        createLine('CD', C, D);
        createLine('DA', D, A);
    };

    // Trapezoid template
    const createTrapezoid = () => {
        const A = createPoint('A', -2, -1);
        const B = createPoint('B', 2, -1);
        const C = createPoint('C', 1, 1);
        const D = createPoint('D', -1, 1);
        createLine('AB', A, B);
        createLine('BC', B, C);
        createLine('CD', C, D);
        createLine('DA', D, A);
    };

    // Regular pentagon template
    const createPentagon = () => {
        const r = 2;
        const points: string[] = [];
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI / 2) + (2 * Math.PI * i / 5);
            const x = r * Math.cos(angle);
            const y = r * Math.sin(angle);
            points.push(createPoint(String.fromCharCode(65 + i), x, y));
        }
        for (let i = 0; i < 5; i++) {
            createLine(`${String.fromCharCode(65 + i)}${String.fromCharCode(65 + (i + 1) % 5)}`, points[i], points[(i + 1) % 5]);
        }
    };

    // Regular hexagon template
    const createHexagon = () => {
        const r = 2;
        const points: string[] = [];
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 2) + (2 * Math.PI * i / 6);
            const x = r * Math.cos(angle);
            const y = r * Math.sin(angle);
            points.push(createPoint(String.fromCharCode(65 + i), x, y));
        }
        for (let i = 0; i < 6; i++) {
            createLine(`${String.fromCharCode(65 + i)}${String.fromCharCode(65 + (i + 1) % 6)}`, points[i], points[(i + 1) % 6]);
        }
    };

    // Circle template
    const createCircle = () => {
        const centerId = createPoint('O', 0, 0);
        const edgeId = createPoint('P', 2, 0);
        addElement({
            id: generateId(),
            type: 'circle',
            name: '圆O',
            visible: true,
            style: { stroke: '#000', strokeWidth: 2 },
            dependencies: [centerId, edgeId],
            definition: { type: 'circle_by_points', center: centerId, edge: edgeId },
            center: centerId,
            edge: edgeId
        } as any);
    };

    const templates: Template[] = [
        { id: 'triangle', name: '三角形', icon: <Triangle size={20} />, description: '普通三角形', create: createTriangle },
        { id: 'right-triangle', name: '直角三角形', icon: <Triangle size={20} />, description: '含90°角', create: createRightTriangle },
        { id: 'isosceles', name: '等腰三角形', icon: <Triangle size={20} />, description: '两边相等', create: createIsoscelesTriangle },
        { id: 'equilateral', name: '等边三角形', icon: <Triangle size={20} />, description: '三边相等', create: createEquilateralTriangle },
        { id: 'square', name: '正方形', icon: <Square size={20} />, description: '四边相等', create: createSquare },
        { id: 'rectangle', name: '矩形', icon: <Square size={20} />, description: '四角为直角', create: createRectangle },
        { id: 'parallelogram', name: '平行四边形', icon: <Square size={20} />, description: '对边平行', create: createParallelogram },
        { id: 'trapezoid', name: '梯形', icon: <Square size={20} />, description: '一对平行边', create: createTrapezoid },
        { id: 'pentagon', name: '正五边形', icon: <Pentagon size={20} />, description: '五边相等', create: createPentagon },
        { id: 'hexagon', name: '正六边形', icon: <Hexagon size={20} />, description: '六边相等', create: createHexagon },
        { id: 'circle', name: '圆', icon: <CircleIcon size={20} />, description: '半径为2', create: createCircle },
    ];

    const handleTemplateClick = (template: Template) => {
        template.create();
        // Switch to select tool after creating
        useToolStore.getState().setActiveTool('select');
    };

    return (
        <div className={clsx(
            "absolute left-4 bottom-14 rounded-lg shadow-lg w-72 z-10 max-h-96 overflow-hidden",
            darkTheme ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800"
        )}>
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={clsx(
                    "w-full flex items-center justify-between p-3 rounded-t-lg",
                    darkTheme ? "hover:bg-gray-700" : "hover:bg-gray-50"
                )}
            >
                <span className="font-bold text-sm">模板库</span>
                {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {!isCollapsed && (
                <div className="p-2 pt-0 overflow-y-auto max-h-72">
                    <p className={clsx("text-xs mb-2 px-1", darkTheme ? "text-gray-400" : "text-gray-500")}>
                        点击模板快速创建图形
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        {templates.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => handleTemplateClick(template)}
                                className={clsx(
                                    "flex flex-col items-center p-3 rounded-lg text-sm transition-colors",
                                    darkTheme
                                        ? "bg-gray-700 hover:bg-gray-600"
                                        : "bg-gray-50 hover:bg-gray-100"
                                )}
                            >
                                <div className={clsx("mb-1", darkTheme ? "text-blue-400" : "text-blue-600")}>
                                    {template.icon}
                                </div>
                                <span className="font-medium">{template.name}</span>
                                <span className={clsx("text-xs", darkTheme ? "text-gray-400" : "text-gray-500")}>
                                    {template.description}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
