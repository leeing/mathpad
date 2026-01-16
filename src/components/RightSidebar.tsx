import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { useGeoStore } from '../store/geoStore';
import { useToolStore } from '../store/toolStore';
import { useViewStore } from '../store/viewStore';
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
        case 'vector': return '⟶';
        case 'angle': return '∠';
        case 'label': return 'T';
        default: return '◇';
    }
};

export const RightSidebar: React.FC = () => {
    const [collapsed, setCollapsed] = useState(false);

    // Element list state
    const elements = useGeoStore((state) => state.elements);
    const updateElement = useGeoStore((state) => state.updateElement);
    const selection = useGeoStore((state) => state.selection);
    const setSelection = useGeoStore((state) => state.setSelection);
    const getElementById = useGeoStore((state) => state.getElementById);

    // Tool state
    const selectedId = useToolStore((state) => state.selectedId);
    const setSelectedId = useToolStore((state) => state.setSelectedId);

    // View state
    const darkTheme = useViewStore((state) => state.darkTheme);
    const showHiddenElements = useViewStore((state) => state.showHiddenElements);
    const toggleShowHiddenElements = useViewStore((state) => state.toggleShowHiddenElements);
    const setSelectedElementY = useViewStore((state) => state.setSelectedElementY);

    const elementList = Object.values(elements);

    // Group collapsed state - track which groups are collapsed
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    // Refs for tracking element row positions
    const elementRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Type labels in Chinese
    const typeLabels: Record<string, string> = {
        point: '点',
        line: '线段/直线',
        circle: '圆',
        ellipse: '椭圆',
        parabola: '抛物线',
        rectangle: '矩形',
        arc: '弧',
        angle: '角',
        segment_mark: '标记',
        label: '标签',
    };

    // Group elements by type
    const groupedElements = elementList.reduce((groups, element) => {
        const type = element.type;
        if (!groups[type]) {
            groups[type] = [];
        }
        groups[type].push(element);
        return groups;
    }, {} as Record<string, typeof elementList>);

    // Order of type groups
    const typeOrder = ['point', 'line', 'circle', 'ellipse', 'parabola', 'rectangle', 'arc', 'angle', 'segment_mark', 'label'];
    const sortedTypes = Object.keys(groupedElements).sort((a, b) => {
        const aIndex = typeOrder.indexOf(a);
        const bIndex = typeOrder.indexOf(b);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

    // Auto-expand the group containing the selected element
    useEffect(() => {
        if (selectedId) {
            const element = getElementById(selectedId);
            if (element) {
                // Expand the group containing this element
                setCollapsedGroups(prev => {
                    const next = new Set(prev);
                    next.delete(element.type);
                    return next;
                });

                // Report the Y position after a short delay to allow render
                setTimeout(() => {
                    const rowElement = elementRefs.current[selectedId];
                    if (rowElement) {
                        const rect = rowElement.getBoundingClientRect();
                        setSelectedElementY(rect.top);
                    }
                }, 50);
            }
        } else {
            setSelectedElementY(null);
        }
    }, [selectedId, getElementById, setSelectedElementY]);

    const toggleGroupCollapse = (type: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(type)) {
                next.delete(type);
            } else {
                next.add(type);
            }
            return next;
        });
    };

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

    // Collapsed state - just show toggle button
    if (collapsed) {
        return (
            <button
                onClick={() => setCollapsed(false)}
                className={clsx(
                    "absolute right-2 top-20 p-2 rounded-lg shadow-lg z-10",
                    darkTheme ? "bg-gray-800 text-gray-100 hover:bg-gray-700" : "bg-white text-gray-800 hover:bg-gray-50"
                )}
                title="展开侧边栏"
            >
                <ChevronLeft size={20} />
            </button>
        );
    }

    return (
        <div className={clsx(
            "absolute right-0 top-20 bottom-8 w-60 flex flex-col z-10 shadow-xl",
            darkTheme ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800"
        )}>
            {/* Header with collapse button */}
            <div className={clsx(
                "flex items-center justify-between px-3 py-2 border-b",
                darkTheme ? "border-gray-700" : "border-gray-200"
            )}>
                <span className="text-sm font-bold">面板</span>
                <button
                    onClick={() => setCollapsed(true)}
                    className={clsx(
                        "p-1 rounded",
                        darkTheme ? "hover:bg-gray-700" : "hover:bg-gray-100"
                    )}
                    title="折叠侧边栏"
                >
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* Element List Section */}
            <div className={clsx(
                "flex-1 overflow-y-auto",
                darkTheme ? "border-gray-700" : "border-gray-200"
            )}>
                <div className={clsx(
                    "flex items-center justify-between px-3 py-1.5",
                    darkTheme ? "bg-gray-750" : "bg-gray-50"
                )}>
                    <span className="text-xs font-medium">元素列表 ({elementList.length})</span>
                    <button
                        onClick={toggleShowHiddenElements}
                        className={clsx(
                            "p-1 rounded text-xs",
                            showHiddenElements
                                ? "bg-blue-500 text-white"
                                : darkTheme ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-600"
                        )}
                        title={showHiddenElements ? "隐藏的元素已显示" : "显示隐藏的元素"}
                    >
                        {showHiddenElements ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                </div>

                {elementList.length === 0 ? (
                    <div className={clsx(
                        "px-3 py-4 text-xs text-center",
                        darkTheme ? "text-gray-500" : "text-gray-400"
                    )}>
                        暂无元素
                    </div>
                ) : (
                    <div className="px-1 py-1">
                        {sortedTypes.map((type) => {
                            const typeElements = groupedElements[type];
                            const isGroupCollapsed = collapsedGroups.has(type);
                            const groupLabel = typeLabels[type] || type;

                            return (
                                <div key={type} className="mb-1">
                                    {/* Group Header */}
                                    <button
                                        onClick={() => toggleGroupCollapse(type)}
                                        className={clsx(
                                            "w-full flex items-center justify-between px-2 py-1 rounded text-xs font-medium",
                                            darkTheme ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-100 text-gray-600"
                                        )}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            {isGroupCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                                            <span>{getElementIcon(type)}</span>
                                            <span>{groupLabel}</span>
                                        </div>
                                        <span className={clsx(
                                            "text-[10px] px-1.5 rounded-full",
                                            darkTheme ? "bg-gray-700" : "bg-gray-200"
                                        )}>
                                            {typeElements.length}
                                        </span>
                                    </button>

                                    {/* Group Elements */}
                                    {!isGroupCollapsed && (
                                        <div className="ml-3 border-l border-gray-300 dark:border-gray-600 pl-1">
                                            {typeElements.map((element) => {
                                                const isSelected = selection.includes(element.id);
                                                const isHidden = !element.visible;

                                                return (
                                                    <div
                                                        key={element.id}
                                                        ref={(el) => { elementRefs.current[element.id] = el; }}
                                                        onClick={() => handleSelectElement(element.id)}
                                                        className={clsx(
                                                            "flex items-center justify-between px-2 py-0.5 rounded cursor-pointer text-xs",
                                                            isSelected
                                                                ? "bg-blue-500 text-white"
                                                                : darkTheme
                                                                    ? "hover:bg-gray-700"
                                                                    : "hover:bg-gray-100",
                                                            isHidden && !isSelected && "opacity-50"
                                                        )}
                                                    >
                                                        <span className={clsx(isHidden && !isSelected && "line-through")}>
                                                            {element.name || element.type}
                                                        </span>
                                                        <button
                                                            onClick={(e) => handleToggleVisibility(element.id, e)}
                                                            className={clsx(
                                                                "p-0.5 rounded",
                                                                isSelected
                                                                    ? "hover:bg-blue-600"
                                                                    : darkTheme
                                                                        ? "hover:bg-gray-600"
                                                                        : "hover:bg-gray-200"
                                                            )}
                                                            title={isHidden ? "显示元素" : "隐藏元素"}
                                                        >
                                                            {isHidden ? <EyeOff size={10} /> : <Eye size={10} />}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

