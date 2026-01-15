import React, { useState } from 'react';
import { Trash2, Minus, MoreHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
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

export const PropertyPanel: React.FC = () => {
    const activeTool = useToolStore((state) => state.activeTool);
    const darkTheme = useViewStore((state) => state.darkTheme);

    const selectedId = useToolStore((state) => state.selectedId);
    const updateElement = useGeoStore((state) => state.updateElement);
    const removeElement = useGeoStore((state) => state.removeElement);
    const getElementById = useGeoStore((state) => state.getElementById);

    const [showColorPicker, setShowColorPicker] = useState(false);

    if (activeTool !== 'select' || !selectedId) return null;

    const element = getElementById(selectedId);
    if (!element) return null;

    const setStyle = (styleUpdate: Partial<GeoStyle>) => {
        updateElement(selectedId, {
            style: { ...element.style, ...styleUpdate }
        });
    };

    const currentStroke = element.style.stroke || '#000000';
    const currentStrokeWidth = element.style.strokeWidth || 2;

    return (
        <div className={clsx(
            "absolute top-20 right-4 p-4 rounded-lg shadow-lg z-10 w-56",
            darkTheme ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800"
        )}>
            <h3 className={clsx(
                "font-bold mb-3 text-sm border-b pb-2",
                darkTheme ? "border-gray-700" : "border-gray-200"
            )}>属性设置</h3>

            <div className="space-y-4">
                {/* Line Style */}
                <div>
                    <label className={clsx("text-xs mb-1 block", darkTheme ? "text-gray-400" : "text-gray-500")}>
                        线条样式
                    </label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setStyle({ dash: undefined })}
                            className={clsx(
                                "p-1.5 rounded border flex-1 flex items-center justify-center gap-1 text-xs",
                                !element.style.dash
                                    ? "bg-blue-100 border-blue-500 text-blue-700"
                                    : darkTheme ? "border-gray-600 hover:bg-gray-700" : "border-gray-200 hover:bg-gray-50"
                            )}
                            title="实线"
                        >
                            <Minus size={14} />
                            <span>实线</span>
                        </button>
                        <button
                            onClick={() => setStyle({ dash: [5, 5] })}
                            className={clsx(
                                "p-1.5 rounded border flex-1 flex items-center justify-center gap-1 text-xs",
                                element.style.dash
                                    ? "bg-blue-100 border-blue-500 text-blue-700"
                                    : darkTheme ? "border-gray-600 hover:bg-gray-700" : "border-gray-200 hover:bg-gray-50"
                            )}
                            title="虚线"
                        >
                            <MoreHorizontal size={14} />
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
                                    "px-2 py-1 rounded border text-xs flex-1",
                                    currentStrokeWidth === sw.value
                                        ? "bg-blue-100 border-blue-500 text-blue-700"
                                        : darkTheme ? "border-gray-600 hover:bg-gray-700" : "border-gray-200 hover:bg-gray-50"
                                )}
                                title={sw.name}
                            >
                                {sw.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Point Size - only for point elements */}
                {element.type === 'point' && (
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
                                        "px-2 py-1 rounded border text-xs flex-1",
                                        (element.style.pointRadius || 6) === ps.value
                                            ? "bg-blue-100 border-blue-500 text-blue-700"
                                            : darkTheme ? "border-gray-600 hover:bg-gray-700" : "border-gray-200 hover:bg-gray-50"
                                    )}
                                    title={ps.name}
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
                    <div className="flex flex-wrap gap-1.5">
                        {COMMON_COLORS.map((color) => (
                            <button
                                key={color.value}
                                onClick={() => setStyle({ stroke: color.value })}
                                className={clsx(
                                    "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                                    currentStroke === color.value ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-300"
                                )}
                                style={{ backgroundColor: color.value }}
                                title={color.name}
                            />
                        ))}
                    </div>

                    {/* Custom Color Picker */}
                    <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className={clsx(
                            "mt-2 text-xs flex items-center gap-1",
                            darkTheme ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        {showColorPicker ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        更多颜色
                    </button>

                    {showColorPicker && (
                        <div className="mt-2 flex items-center gap-2">
                            <input
                                type="color"
                                value={currentStroke}
                                onChange={(e) => setStyle({ stroke: e.target.value })}
                                className="w-8 h-8 rounded cursor-pointer border-0"
                            />
                            <span className={clsx("text-xs", darkTheme ? "text-gray-400" : "text-gray-500")}>
                                {currentStroke}
                            </span>
                        </div>
                    )}
                </div>

                {/* Delete */}
                <div className={clsx("border-t pt-3 mt-3", darkTheme ? "border-gray-700" : "border-gray-200")}>
                    <button
                        onClick={() => {
                            removeElement(selectedId);
                            useToolStore.getState().setSelectedId(null);
                        }}
                        className="flex items-center gap-2 text-red-500 text-sm hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded w-full"
                    >
                        <Trash2 size={16} />
                        删除元素
                    </button>
                </div>
            </div>
        </div>
    );
};
