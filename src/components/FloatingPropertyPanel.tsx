import React, { useState } from 'react';
import { Trash2, Minus, MoreHorizontal, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useToolStore } from '../store/toolStore';
import { useGeoStore } from '../store/geoStore';
import { useViewStore } from '../store/viewStore';
import { clsx } from 'clsx';
import type { GeoStyle } from '../types/geoElements';

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

export const FloatingPropertyPanel: React.FC = () => {
    const [showColorPicker, setShowColorPicker] = useState(false);

    const activeTool = useToolStore((state) => state.activeTool);
    const selectedId = useToolStore((state) => state.selectedId);
    const setSelectedId = useToolStore((state) => state.setSelectedId);
    const updateElement = useGeoStore((state) => state.updateElement);
    const removeElement = useGeoStore((state) => state.removeElement);
    const getElementById = useGeoStore((state) => state.getElementById);
    const darkTheme = useViewStore((state) => state.darkTheme);
    const selectedElementY = useViewStore((state) => state.selectedElementY);

    const selectedElement = selectedId ? getElementById(selectedId) : null;

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

    // Calculate top position - use selectedElementY if available, otherwise fallback
    // Clamp to ensure panel stays on screen (min 80px from top, max to leave 300px at bottom)
    const topPosition = selectedElementY
        ? Math.max(80, Math.min(selectedElementY - 20, window.innerHeight - 350))
        : 80;

    return (
        <div
            className={clsx(
                "absolute w-52 rounded-lg shadow-xl z-20",
                darkTheme ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800"
            )}
            style={{ right: '252px', top: `${topPosition}px` }}
        >
            {/* Header */}
            <div className={clsx(
                "flex items-center justify-between px-3 py-2 border-b",
                darkTheme ? "border-gray-700" : "border-gray-200"
            )}>
                <span className="text-xs font-bold">属性 - {selectedElement.name}</span>
                <button
                    onClick={handleClose}
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

                    <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className={clsx(
                            "mt-1 text-xs flex items-center gap-1",
                            darkTheme ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        {showColorPicker ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                        更多颜色
                    </button>

                    {showColorPicker && (
                        <div className="mt-1 flex items-center gap-2">
                            <input
                                type="color"
                                value={selectedElement.style.stroke || '#000000'}
                                onChange={(e) => setStyle({ stroke: e.target.value })}
                                className="w-6 h-6 rounded cursor-pointer border-0"
                            />
                            <span className={clsx("text-xs", darkTheme ? "text-gray-400" : "text-gray-500")}>
                                {selectedElement.style.stroke || '#000000'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Delete */}
                <div className={clsx("border-t pt-2", darkTheme ? "border-gray-700" : "border-gray-200")}>
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
        </div>
    );
};
