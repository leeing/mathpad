import React from 'react';
import { EyeOff, Trash2, Settings } from 'lucide-react';
import { useGeoStore } from '../store/geoStore';
import { useToolStore } from '../store/toolStore';
import { useViewStore } from '../store/viewStore';
import { clsx } from 'clsx';

interface ContextMenuProps {
    x: number;
    y: number;
    elementId: string | null;
    onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, elementId, onClose }) => {
    const updateElement = useGeoStore((state) => state.updateElement);
    const removeElement = useGeoStore((state) => state.removeElement);
    const getElementById = useGeoStore((state) => state.getElementById);
    const setSelectedId = useToolStore((state) => state.setSelectedId);
    const darkTheme = useViewStore((state) => state.darkTheme);
    const showGrid = useViewStore((state) => state.showGrid);
    const showAxes = useViewStore((state) => state.showAxes);
    const setShowGrid = useViewStore((state) => state.setShowGrid);
    const setShowAxes = useViewStore((state) => state.setShowAxes);
    const toggleExamMode = useViewStore((state) => state.toggleExamMode);
    const toggleSuggestionsEnabled = useViewStore((state) => state.toggleSuggestionsEnabled);
    const setScale = useViewStore((state) => state.setScale);
    const setPosition = useViewStore((state) => state.setPosition);
    const size = useViewStore((state) => state.size);

    const element = elementId ? getElementById(elementId) : null;
    if (elementId && !element) return null;

    const handleHide = () => {
        if (!elementId) return;
        updateElement(elementId, { visible: false });
        onClose();
    };

    const handleDelete = () => {
        if (!elementId) return;
        removeElement(elementId);
        onClose();
    };

    const handleProperties = () => {
        if (!elementId) return;
        setSelectedId(elementId);
        useGeoStore.getState().setSelection([elementId]);
        onClose();
    };

    const handleResetView = () => {
        setScale(1);
        setPosition({ x: size.width / 2, y: size.height / 2 });
        onClose();
    };

    // Prevent context menu from appearing outside viewport
    const menuStyle: React.CSSProperties = {
        position: 'fixed',
        left: Math.min(x, window.innerWidth - 160),
        top: Math.min(y, window.innerHeight - 140),
        zIndex: 1000,
    };

    return (
        <>
            {/* Backdrop to close menu */}
            <div
                className="fixed inset-0 z-50"
                onClick={onClose}
                onContextMenu={(e) => { e.preventDefault(); onClose(); }}
            />
            {/* Menu */}
            <div
                className={clsx(
                    "fixed z-50 rounded-lg shadow-xl border py-1 min-w-[160px]",
                    darkTheme ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                )}
                style={menuStyle}
            >
                {elementId ? (
                    <>
                        <button
                            className={clsx(
                                "w-full px-3 py-2 text-left text-sm flex items-center gap-2",
                                darkTheme ? "text-gray-200 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"
                            )}
                            onClick={handleHide}
                        >
                            <EyeOff size={14} />
                            隐藏
                        </button>
                        <button
                            className={clsx(
                                "w-full px-3 py-2 text-left text-sm flex items-center gap-2",
                                darkTheme ? "text-red-300 hover:bg-red-900/20" : "text-red-600 hover:bg-red-50"
                            )}
                            onClick={handleDelete}
                        >
                            <Trash2 size={14} />
                            删除
                        </button>
                        <div className={clsx("border-t my-1", darkTheme ? "border-gray-700" : "border-gray-200")} />
                        <button
                            className={clsx(
                                "w-full px-3 py-2 text-left text-sm flex items-center gap-2",
                                darkTheme ? "text-gray-200 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"
                            )}
                            onClick={handleProperties}
                        >
                            <Settings size={14} />
                            属性...
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            className={clsx(
                                "w-full px-3 py-2 text-left text-sm flex items-center gap-2",
                                darkTheme ? "text-gray-200 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"
                            )}
                            onClick={() => { setShowGrid(!showGrid); onClose(); }}
                        >
                            <Settings size={14} />
                            {showGrid ? '隐藏网格' : '显示网格'}
                        </button>
                        <button
                            className={clsx(
                                "w-full px-3 py-2 text-left text-sm flex items-center gap-2",
                                darkTheme ? "text-gray-200 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"
                            )}
                            onClick={() => { setShowAxes(!showAxes); onClose(); }}
                        >
                            <Settings size={14} />
                            {showAxes ? '隐藏坐标轴' : '显示坐标轴'}
                        </button>
                        <button
                            className={clsx(
                                "w-full px-3 py-2 text-left text-sm flex items-center gap-2",
                                darkTheme ? "text-gray-200 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"
                            )}
                            onClick={() => { toggleExamMode(); onClose(); }}
                        >
                            <Settings size={14} />
                            切换试卷风格
                        </button>
                        <button
                            className={clsx(
                                "w-full px-3 py-2 text-left text-sm flex items-center gap-2",
                                darkTheme ? "text-gray-200 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"
                            )}
                            onClick={() => { toggleSuggestionsEnabled(); onClose(); }}
                        >
                            <Settings size={14} />
                            切换智能建议
                        </button>
                        <div className={clsx("border-t my-1", darkTheme ? "border-gray-700" : "border-gray-200")} />
                        <button
                            className={clsx(
                                "w-full px-3 py-2 text-left text-sm flex items-center gap-2",
                                darkTheme ? "text-gray-200 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"
                            )}
                            onClick={handleResetView}
                        >
                            <Settings size={14} />
                            视图复位
                        </button>
                    </>
                )}
            </div>
        </>
    );
};
