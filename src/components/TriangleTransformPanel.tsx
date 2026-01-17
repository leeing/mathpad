import React from 'react';
import { useToolStore } from '../store/toolStore';
import { useViewStore } from '../store/viewStore';
import { clsx } from 'clsx';
import type { FlipType } from '../core/triangleTransform';

export const TriangleTransformPanel: React.FC = () => {
    const activeTool = useToolStore((state) => state.activeTool);
    const tempIds = useToolStore((state) => state.tempIds);
    const darkTheme = useViewStore((state) => state.darkTheme);
    const triangleTransform = useViewStore((state) => state.triangleTransform);
    const setTriangleTransform = useViewStore((state) => state.setTriangleTransform);
    const viewSize = useViewStore((state) => state.size);

    // Only show for congruent/similar tools
    if (activeTool !== 'congruent' && activeTool !== 'similar') return null;

    const isCongruent = activeTool === 'congruent';
    const hasSelectedTriangle = tempIds.length === 3;

    // Position panel to the right of toolbar, vertically centered
    const panelTop = Math.max(60, viewSize.height / 2 - 100);  // Center vertically, min 60px from top

    return (
        <div
            className={clsx(
                "absolute w-48 rounded-lg shadow-lg p-3 z-20",
                darkTheme ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800"
            )}
            style={{ left: 90, top: panelTop }}
        >
            <h3 className="font-bold text-sm mb-2">
                {isCongruent ? '全等三角形' : '相似三角形'}
            </h3>

            <div className="space-y-3 text-xs">
                {/* Scale (only for similar) */}
                {!isCongruent && (
                    <div>
                        <label className={clsx("block mb-1", darkTheme ? "text-gray-400" : "text-gray-500")}>
                            比例 k
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            max="5"
                            value={triangleTransform.scale}
                            onChange={(e) => setTriangleTransform({ scale: parseFloat(e.target.value) || 1 })}
                            className={clsx(
                                "w-full border rounded px-2 py-1",
                                darkTheme ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                            )}
                        />
                    </div>
                )}

                {/* Rotation */}
                <div>
                    <label className={clsx("block mb-1", darkTheme ? "text-gray-400" : "text-gray-500")}>
                        旋转角度
                    </label>
                    <div className="flex gap-1 mb-1.5 flex-wrap">
                        {[0, 30, 45, 60, 90, 180, 270].map((deg) => (
                            <button
                                key={deg}
                                onClick={() => setTriangleTransform({ rotationDeg: deg })}
                                className={clsx(
                                    "px-1.5 py-0.5 rounded text-xs border",
                                    triangleTransform.rotationDeg === deg
                                        ? "bg-blue-100 border-blue-500 text-blue-700"
                                        : darkTheme ? "border-gray-600 hover:bg-gray-700" : "border-gray-200 hover:bg-gray-50"
                                )}
                            >
                                {deg}°
                            </button>
                        ))}
                    </div>
                    <input
                        type="number"
                        min="0"
                        max="360"
                        value={triangleTransform.rotationDeg}
                        onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setTriangleTransform({ rotationDeg: Math.min(360, Math.max(0, val)) });
                        }}
                        className={clsx(
                            "w-full border rounded px-2 py-1",
                            darkTheme ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                        )}
                        placeholder="自定义 (0-360)"
                    />
                </div>

                {/* Flip */}
                <div>
                    <label className={clsx("block mb-1", darkTheme ? "text-gray-400" : "text-gray-500")}>
                        翻转
                    </label>
                    <div className="space-y-1">
                        {[
                            { value: 'none', label: '无' },
                            { value: 'horizontal', label: '水平翻转' },
                            { value: 'vertical', label: '垂直翻转' }
                        ].map((option) => (
                            <label key={option.value} className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                    type="radio"
                                    name="flip"
                                    checked={triangleTransform.flip === option.value}
                                    onChange={() => setTriangleTransform({ flip: option.value as FlipType })}
                                    className="accent-blue-500"
                                />
                                <span>{option.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Status */}
                <div className={clsx(
                    "mt-2 pt-2 border-t text-xs",
                    darkTheme ? "border-gray-700 text-yellow-300" : "border-gray-200 text-yellow-600"
                )}>
                    {!hasSelectedTriangle
                        ? `请选择三角形的3个顶点 (${tempIds.length}/3)`
                        : '点击画布放置三角形'
                    }
                </div>
            </div>
        </div>
    );
};
