import React from 'react';
import { useGeoStore } from '../store/geoStore';
import { useToolStore } from '../store/toolStore';
import { useViewStore } from '../store/viewStore';
import { Eye, EyeOff } from 'lucide-react';
import { clsx } from 'clsx';

// Get icon for element type
const getElementIcon = (type: string) => {
    switch (type) {
        case 'point': return '●';
        case 'line': return '━';
        case 'segment': return '—';
        case 'ray': return '→';
        case 'circle': return '○';
        case 'ellipse': return '⬭';
        case 'parabola': return '⌒';
        case 'hyperbola': return ')(';
        case 'vector': return '⟶';
        case 'angle': return '∠';
        case 'label': return 'T';
        default: return '◇';
    }
};

export const ElementListPanel: React.FC = () => {
    const elements = useGeoStore((state) => state.elements);
    const updateElement = useGeoStore((state) => state.updateElement);
    const selection = useGeoStore((state) => state.selection);
    const setSelection = useGeoStore((state) => state.setSelection);
    const setSelectedId = useToolStore((state) => state.setSelectedId);
    const darkTheme = useViewStore((state) => state.darkTheme);
    const showHiddenElements = useViewStore((state) => state.showHiddenElements);
    const toggleShowHiddenElements = useViewStore((state) => state.toggleShowHiddenElements);

    const elementList = Object.values(elements);

    if (elementList.length === 0) {
        return null;
    }

    const handleSelectElement = (id: string) => {
        setSelection([id]);
        setSelectedId(id);
    };

    const handleToggleVisibility = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const element = elements[id];
        if (element) {
            updateElement(id, { visible: !element.visible });
        }
    };

    return (
        <div className={clsx(
            "absolute right-4 top-16 rounded-lg shadow-lg w-56 max-h-80 overflow-y-auto z-10",
            darkTheme ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800"
        )}>
            {/* Header with toggle */}
            <div className={clsx(
                "sticky top-0 flex items-center justify-between p-2 border-b",
                darkTheme ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
            )}>
                <span className="text-sm font-bold">元素列表</span>
                <button
                    onClick={toggleShowHiddenElements}
                    className={clsx(
                        "p-1 rounded text-xs flex items-center gap-1",
                        showHiddenElements
                            ? "bg-blue-500 text-white"
                            : darkTheme ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
                    )}
                    title={showHiddenElements ? "隐藏的元素已显示" : "显示隐藏的元素"}
                >
                    {showHiddenElements ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
            </div>

            {/* Element list */}
            <div className="p-1">
                {elementList.map((element) => {
                    const isSelected = selection.includes(element.id);
                    const isHidden = !element.visible;

                    return (
                        <div
                            key={element.id}
                            onClick={() => handleSelectElement(element.id)}
                            className={clsx(
                                "flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-sm",
                                isSelected
                                    ? "bg-blue-500 text-white"
                                    : darkTheme
                                        ? "hover:bg-gray-700"
                                        : "hover:bg-gray-100",
                                isHidden && !isSelected && "opacity-50"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <span className="w-4 text-center">
                                    {getElementIcon(element.type)}
                                </span>
                                <span className={clsx(isHidden && !isSelected && "line-through")}>
                                    {element.name || element.type}
                                </span>
                            </div>
                            <button
                                onClick={(e) => handleToggleVisibility(element.id, e)}
                                className={clsx(
                                    "p-1 rounded",
                                    isSelected
                                        ? "hover:bg-blue-600"
                                        : darkTheme
                                            ? "hover:bg-gray-600"
                                            : "hover:bg-gray-200"
                                )}
                                title={isHidden ? "显示元素" : "隐藏元素"}
                            >
                                {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
