import React from 'react';
import { useToolStore } from '../store/toolStore';
import { useViewStore } from '../store/viewStore';
import { clsx } from 'clsx';
import {
    ArrowUp,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Dot,
    MousePointer2,
    Circle
} from 'lucide-react';

// Segment icon (line with endpoints)
const SegmentIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <line x1="4" y1="18" x2="20" y2="6" />
        <circle cx="4" cy="18" r="2" fill="currentColor" />
        <circle cx="20" cy="6" r="2" fill="currentColor" />
    </svg>
);

const PAN_AMOUNT = 50; // pixels to pan per click
const ZOOM_FACTOR = 1.2; // zoom multiplier

export const QuickToolbar: React.FC = () => {
    const activeTool = useToolStore((state) => state.activeTool);
    const setActiveTool = useToolStore((state) => state.setActiveTool);
    const darkTheme = useViewStore((state) => state.darkTheme);
    const position = useViewStore((state) => state.position);
    const setPosition = useViewStore((state) => state.setPosition);
    const scale = useViewStore((state) => state.scale);
    const setScale = useViewStore((state) => state.setScale);
    const size = useViewStore((state) => state.size);

    // Hide when function tool is active (FormulaInputBar shown instead)
    if (activeTool === 'function') return null;

    const handlePan = (dx: number, dy: number) => {
        setPosition({
            x: position.x + dx,
            y: position.y + dy
        });
    };

    const handleZoom = (zoomIn: boolean) => {
        const newScale = zoomIn ? scale * ZOOM_FACTOR : scale / ZOOM_FACTOR;
        // Clamp scale between 0.1 and 5
        setScale(Math.min(5, Math.max(0.1, newScale)));
    };

    const handleReset = () => {
        // Reset to center and scale 1
        setPosition({ x: size.width / 2, y: size.height / 2 });
        setScale(1);
    };

    const buttons = [
        { icon: ArrowUp, label: '向上移动', action: () => handlePan(0, PAN_AMOUNT) },
        { icon: ArrowDown, label: '向下移动', action: () => handlePan(0, -PAN_AMOUNT) },
        { icon: ArrowLeft, label: '向左移动', action: () => handlePan(PAN_AMOUNT, 0) },
        { icon: ArrowRight, label: '向右移动', action: () => handlePan(-PAN_AMOUNT, 0) },
        { icon: ZoomIn, label: '放大', action: () => handleZoom(true) },
        { icon: ZoomOut, label: '缩小', action: () => handleZoom(false) },
        { icon: RotateCcw, label: '视图复位', action: handleReset },
        { icon: Dot, label: '点工具', action: () => setActiveTool('point'), active: activeTool === 'point' },
        { icon: SegmentIcon, label: '线段', action: () => setActiveTool('line'), active: activeTool === 'line' },
        { icon: Circle, label: '圆', action: () => setActiveTool('circle'), active: activeTool === 'circle' },
        { icon: MousePointer2, label: '选择工具', action: () => setActiveTool('select'), active: activeTool === 'select' },
    ];

    return (
        <div className={clsx(
            "fixed left-1/2 -translate-x-1/2 bottom-12 flex gap-1 rounded-lg shadow-lg px-4 py-3 z-20",
            darkTheme ? "bg-gray-800" : "bg-white"
        )}>
            {buttons.map((btn, index) => (
                <button
                    key={index}
                    onClick={btn.action}
                    title={btn.label}
                    className={clsx(
                        "p-2 rounded-md transition-colors",
                        btn.active
                            ? "bg-blue-100 text-blue-600 dark:bg-gray-700 dark:text-blue-400"
                            : darkTheme
                                ? "hover:bg-gray-700 text-gray-300"
                                : "hover:bg-gray-100 text-gray-600"
                    )}
                >
                    <btn.icon size={20} />
                </button>
            ))}
        </div>
    );
};
