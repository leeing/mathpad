import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Minus, MoreHorizontal, X, GripHorizontal, EyeOff } from 'lucide-react';
import { useToolStore } from '../store/toolStore';
import { useGeoStore } from '../store/geoStore';
import { useViewStore } from '../store/viewStore';
import { clsx } from 'clsx';
import type { GeoStyle, TextElement, PointElement, LineElement, CircleElement } from '../types/geoElements';

// Common colors palette
const COMMON_COLORS = [
    { name: '黑色', value: '#000000' },
    { name: '红色', value: '#ef4444' },
    { name: '蓝色', value: '#3b82f6' },
    { name: '绿色', value: '#22c55e' },
    { name: '橙色', value: '#f97316' },
    { name: '紫色', value: '#a855f7' },
    { name: '粉色', value: '#ec4899' },
    { name: '青色', value: '#06b6d4' },
];

// Stroke width options
const STROKE_WIDTHS = [
    { name: '细', value: 1 },
    { name: '正常', value: 2 },
    { name: '粗', value: 3 },
    { name: '特粗', value: 5 },
];

const MATH_SYMBOLS = [
    '∠', '⊥', '∥', '≅', '∽', '△', '□', '○', 'π', '√', '≤', '≥', '≠', '≈', '°', '′', '″',
    'α', 'β', 'γ', 'θ', 'λ', 'μ', '∑', '∈', '⊂', '⊆', '∩', '∪'
];

// Separate component for text editing with local state for real-time updates
interface TextEditSectionProps {
    initialContent: string;
    fontSize: number;
    selectedId: string;
    updateElement: (id: string, updates: any) => void;
    darkTheme: boolean;
}

const TextEditSection: React.FC<TextEditSectionProps> = ({
    initialContent, fontSize, selectedId, updateElement, darkTheme
}) => {
    const [content, setContent] = useState(initialContent);

    // Update store whenever local content changes
    useEffect(() => {
        updateElement(selectedId, { content });
    }, [content, selectedId, updateElement]);

    return (
        <div className="space-y-2">
            <label className={clsx("text-xs mb-1 block", darkTheme ? "text-gray-400" : "text-gray-500")}>
                文本内容
            </label>
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                rows={2}
                className={clsx(
                    "w-full border rounded px-2 py-1 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500",
                    darkTheme ? "bg-gray-700 border-gray-600 text-gray-100" : "bg-white border-gray-300 text-gray-800"
                )}
                placeholder="输入文本内容..."
            />
            <div className="flex items-center gap-2">
                <label className={clsx("text-xs", darkTheme ? "text-gray-400" : "text-gray-500")}>字号</label>
                <select
                    value={fontSize || 14}
                    onChange={(e) => updateElement(selectedId, { fontSize: parseFloat(e.target.value) || 14 })}
                    className={clsx(
                        "border rounded px-2 py-1 text-xs flex-1",
                        darkTheme ? "bg-gray-700 border-gray-600 text-gray-100" : "bg-white border-gray-300 text-gray-800"
                    )}
                >
                    {[12, 14, 16, 18, 20, 24].map((n) => (
                        <option key={n} value={n}>{n}</option>
                    ))}
                </select>
            </div>
            <div className="flex flex-wrap gap-1">
                {MATH_SYMBOLS.map((s) => (
                    <button
                        key={s}
                        onClick={() => setContent(prev => prev + s)}
                        className={clsx(
                            "px-1.5 py-0.5 rounded border text-xs",
                            darkTheme ? "border-gray-600 hover:bg-gray-700" : "border-gray-200 hover:bg-gray-50"
                        )}
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>
    );
};

export const FloatingPropertyPanel: React.FC = () => {

    const [isDragging, setIsDragging] = useState(false);
    const [panelOffset, setPanelOffset] = useState<{ x: number; y: number } | null>(null);
    const dragStartRef = useRef<{ x: number; y: number } | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const activeTool = useToolStore((state) => state.activeTool);
    const selectedId = useToolStore((state) => state.selectedId);
    const setSelectedId = useToolStore((state) => state.setSelectedId);
    const updateElement = useGeoStore((state) => state.updateElement);
    const removeElement = useGeoStore((state) => state.removeElement);
    const getElementById = useGeoStore((state) => state.getElementById);
    const darkTheme = useViewStore((state) => state.darkTheme);
    const scale = useViewStore((state) => state.scale);
    const position = useViewStore((state) => state.position);

    const selectedElement = selectedId ? getElementById(selectedId) : null;
    const textElement = selectedElement?.type === 'text' ? (selectedElement as TextElement) : null;

    // Reset panel offset when element changes - MUST be before any early return
    useEffect(() => {
        setPanelOffset(null);
    }, [selectedId]);

    // Drag effect - MUST be before any early return
    useEffect(() => {
        if (!isDragging) return;

        const onMouseMove = (e: MouseEvent) => {
            if (!dragStartRef.current) return;
            const dx = e.clientX - dragStartRef.current.x;
            const dy = e.clientY - dragStartRef.current.y;
            setPanelOffset(prev => ({
                x: (prev?.x || 0) + dx,
                y: (prev?.y || 0) + dy
            }));
            dragStartRef.current = { x: e.clientX, y: e.clientY };
        };

        const onMouseUp = () => {
            setIsDragging(false);
            dragStartRef.current = null;
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [isDragging]);

    // Only show when in select mode with a selected element
    if (activeTool !== 'select' || !selectedElement) return null;

    const setStyle = (styleUpdate: Partial<GeoStyle>) => {
        if (selectedId && selectedElement) {
            updateElement(selectedId, {
                style: { ...selectedElement.style, ...styleUpdate }
            });
        }
    };

    const handleClose = () => {
        setSelectedId(null);
    };

    // Drag handlers
    const handleDragStart = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
    };

    // Calculate element's screen position based on its canvas coordinates
    const getElementScreenPosition = (): { x: number; y: number } => {
        let elementX = 0;
        let elementY = 0;

        if ('x' in selectedElement && typeof (selectedElement as any).x === 'number') {
            elementX = (selectedElement as PointElement).x;
            elementY = (selectedElement as PointElement).y;
        } else if ('p1' in selectedElement && typeof (selectedElement as any).p1 === 'string') {
            const p1 = getElementById((selectedElement as LineElement).p1) as PointElement | undefined;
            const p2 = getElementById((selectedElement as LineElement).p2) as PointElement | undefined;
            if (p1 && p2) {
                elementX = (p1.x + p2.x) / 2;
                elementY = (p1.y + p2.y) / 2;
            } else if (p1) {
                elementX = p1.x;
                elementY = p1.y;
            }
        } else if ('center' in selectedElement && typeof (selectedElement as any).center === 'string') {
            const center = getElementById((selectedElement as CircleElement).center) as PointElement | undefined;
            if (center) {
                elementX = center.x;
                elementY = center.y;
            }
        }

        const screenX = elementX * scale + position.x;
        const screenY = elementY * scale + position.y;
        return { x: screenX, y: screenY };
    };

    // Calculate panel position
    const elementPos = getElementScreenPosition();
    const panelWidth = 260; // w-64 = 16rem = 256px
    const panelHeight = 450;
    const offset = 120;

    let leftPosition = elementPos.x + offset + (panelOffset?.x || 0);
    if (leftPosition + panelWidth > window.innerWidth - 260) {
        leftPosition = elementPos.x - panelWidth - offset + (panelOffset?.x || 0);
    }
    leftPosition = Math.max(180, Math.min(leftPosition, window.innerWidth - panelWidth - 260));
    const topPosition = Math.max(80, Math.min(elementPos.y + 30 + (panelOffset?.y || 0), window.innerHeight - panelHeight));

    return (
        <div
            ref={panelRef}
            className={clsx(
                "fixed w-64 rounded-lg shadow-xl z-30",
                darkTheme ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800"
            )}
            style={{ left: `${leftPosition}px`, top: `${topPosition}px` }}
        >
            {/* Header - draggable */}
            <div
                className={clsx(
                    "flex items-center justify-between px-3 py-2 border-b cursor-move select-none",
                    darkTheme ? "border-gray-700" : "border-gray-200"
                )}
                onMouseDown={handleDragStart}
            >
                <div className="flex items-center gap-2">
                    <GripHorizontal size={14} className="opacity-50" />
                    <span className="text-xs font-bold">属性 - {selectedElement.name}</span>
                </div>
                <button
                    onClick={handleClose}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={clsx(
                        "p-1 rounded",
                        darkTheme ? "hover:bg-gray-700" : "hover:bg-gray-100"
                    )}
                    title="关闭"
                >
                    <X size={14} />
                </button>
            </div>

            <div className="p-3 space-y-3">
                {/* Line Style */}
                <div>
                    <label className={clsx("text-xs mb-1 block", darkTheme ? "text-gray-400" : "text-gray-500")}>
                        线条样式
                    </label>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setStyle({ dash: undefined })}
                            className={clsx(
                                "p-1 rounded border flex-1 flex items-center justify-center gap-1 text-xs",
                                !selectedElement.style.dash
                                    ? "bg-blue-100 border-blue-500 text-blue-700"
                                    : darkTheme ? "border-gray-600 hover:bg-gray-700" : "border-gray-200 hover:bg-gray-50"
                            )}
                        >
                            <Minus size={12} />
                            <span>实线</span>
                        </button>
                        <button
                            onClick={() => setStyle({ dash: [5, 5] })}
                            className={clsx(
                                "p-1 rounded border flex-1 flex items-center justify-center gap-1 text-xs",
                                selectedElement.style.dash
                                    ? "bg-blue-100 border-blue-500 text-blue-700"
                                    : darkTheme ? "border-gray-600 hover:bg-gray-700" : "border-gray-200 hover:bg-gray-50"
                            )}
                        >
                            <MoreHorizontal size={12} />
                            <span>虚线</span>
                        </button>
                    </div>
                </div>

                {/* Stroke Width */}
                <div>
                    <label className={clsx("text-xs mb-1 block", darkTheme ? "text-gray-400" : "text-gray-500")}>
                        线条粗细
                    </label>
                    <div className="flex gap-1">
                        {STROKE_WIDTHS.map((sw) => (
                            <button
                                key={sw.value}
                                onClick={() => setStyle({ strokeWidth: sw.value })}
                                className={clsx(
                                    "px-1.5 py-0.5 rounded border text-xs flex-1",
                                    (selectedElement.style.strokeWidth || 2) === sw.value
                                        ? "bg-blue-100 border-blue-500 text-blue-700"
                                        : darkTheme ? "border-gray-600 hover:bg-gray-700" : "border-gray-200 hover:bg-gray-50"
                                )}
                            >
                                {sw.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Point Size */}
                {selectedElement.type === 'point' && (
                    <div>
                        <label className={clsx("text-xs mb-1 block", darkTheme ? "text-gray-400" : "text-gray-500")}>
                            点大小
                        </label>
                        <div className="flex gap-1">
                            {[
                                { name: '小', value: 4 },
                                { name: '中', value: 6 },
                                { name: '大', value: 8 },
                            ].map((ps) => (
                                <button
                                    key={ps.value}
                                    onClick={() => setStyle({ pointRadius: ps.value })}
                                    className={clsx(
                                        "px-2 py-0.5 rounded border text-xs flex-1",
                                        (selectedElement.style.pointRadius || 6) === ps.value
                                            ? "bg-blue-100 border-blue-500 text-blue-700"
                                            : darkTheme ? "border-gray-600 hover:bg-gray-700" : "border-gray-200 hover:bg-gray-50"
                                    )}
                                >
                                    {ps.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {textElement && (
                    <TextEditSection
                        key={selectedId}
                        initialContent={textElement.content}
                        fontSize={textElement.fontSize}
                        selectedId={selectedId!}
                        updateElement={updateElement}
                        darkTheme={darkTheme}
                    />
                )}

                {/* Color */}
                <div>
                    <label className={clsx("text-xs mb-1 block", darkTheme ? "text-gray-400" : "text-gray-500")}>
                        颜色
                    </label>
                    <div className="flex flex-wrap gap-1">
                        {COMMON_COLORS.map((color) => (
                            <button
                                key={color.value}
                                onClick={() => setStyle({ stroke: color.value })}
                                className={clsx(
                                    "w-5 h-5 rounded-full border-2 transition-transform hover:scale-110",
                                    (selectedElement.style.stroke || '#000000') === color.value
                                        ? "border-blue-500 ring-1 ring-blue-200"
                                        : "border-gray-300"
                                )}
                                style={{ backgroundColor: color.value }}
                                title={color.name}
                            />
                        ))}
                    </div>
                </div>

                {/* Hide / Delete */}
                <div className={clsx("border-t pt-2 space-y-1", darkTheme ? "border-gray-700" : "border-gray-200")}>
                    <button
                        onClick={() => {
                            updateElement(selectedId!, { visible: false });
                            setSelectedId(null);
                        }}
                        className={clsx(
                            "flex items-center gap-1.5 text-xs p-1 rounded w-full",
                            darkTheme ? "text-gray-300 hover:bg-gray-700" : "text-gray-600 hover:bg-gray-100"
                        )}
                    >
                        <EyeOff size={14} />
                        隐藏元素
                    </button>
                    <button
                        onClick={() => {
                            removeElement(selectedId!);
                            setSelectedId(null);
                        }}
                        className="flex items-center gap-1.5 text-red-500 text-xs hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded w-full"
                    >
                        <Trash2 size={14} />
                        删除元素
                    </button>
                </div>
            </div>
        </div >
    );
};
