import React, { useState } from 'react';
import { 
  MousePointer2, 
  Circle, 
  Minus, 
  Ruler, 
  Triangle, 
  CheckSquare, 
  Square, 
  MoveDiagonal, 
  Type, 
  ChevronDown, 
  ChevronRight, 
  Dot,
  MinusSquare,
  LayoutTemplate,
  FlipVertical2,
  AlignHorizontalSpaceAround,
  Crosshair,
  CircleDotDashed,
  Target,
  Hash,
  Equal,
  Percent
} from 'lucide-react';
import { useToolStore } from '../store/toolStore';
import { useViewStore } from '../store/viewStore';
import type { ToolType } from '../store/toolStore';
import { clsx } from 'clsx';

// Custom Icons for Math Shapes
const EllipseIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
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
    <ellipse cx="12" cy="12" rx="10" ry="6" />
  </svg>
);

const ParabolaIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
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
    <path d="M4 4 Q12 20 20 4" />
  </svg>
);

const HyperbolaIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
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
    <path d="M5 19 C9 14 9 10 5 5" />
    <path d="M19 19 C15 14 15 10 19 5" />
  </svg>
);

type ToolItem = { id: ToolType; icon: React.ElementType; label: string; shortcut?: string };
type ToolGroup = { name: string; items: ToolItem[]; defaultOpen?: boolean };

export const Toolbar: React.FC = () => {
  const { activeTool, setActiveTool } = useToolStore();
  const darkTheme = useViewStore((state) => state.darkTheme);

  const toolGroups: ToolGroup[] = [
    // Selection - always expanded
    {
      name: '选择',
      defaultOpen: true,
      items: [
        { id: 'select', icon: MousePointer2, label: '选择 (V)', shortcut: 'V' },
      ]
    },
    // Drawing
    {
      name: '绘图',
      defaultOpen: true,
      items: [
        { id: 'point', icon: Dot, label: '点 (P)', shortcut: 'P' },
        { id: 'line', icon: Minus, label: '线段 (L)', shortcut: 'L' },
        { id: 'vector', icon: MoveDiagonal, label: '向量', shortcut: 'V' },
        { id: 'circle', icon: Circle, label: '圆 (C)', shortcut: 'C' },
        { id: 'ellipse', icon: EllipseIcon, label: '椭圆', shortcut: 'E' },
        { id: 'parabola', icon: ParabolaIcon, label: '抛物线', shortcut: 'P' },
        { id: 'hyperbola', icon: HyperbolaIcon, label: '双曲线', shortcut: 'H' },
        { id: 'rectangle', icon: Square, label: '矩形 (R)', shortcut: 'R' },
        { id: 'auxiliary', icon: MinusSquare, label: '辅助线' },
        { id: 'template', icon: LayoutTemplate, label: '模板库' },
      ]
    },
    // Construction
    {
      name: '构造',
      defaultOpen: true,
      items: [
        { id: 'perpendicular', icon: FlipVertical2, label: '垂线' },
        { id: 'parallel', icon: AlignHorizontalSpaceAround, label: '平行线' },
        { id: 'midpoint', icon: Crosshair, label: '中点' },
        { id: 'incenter', icon: CircleDotDashed, label: '内心+内切圆' },
        { id: 'circumcenter', icon: Target, label: '外心+外接圆' },
      ]
    },
    // Annotation
    {
      name: '标注',
      defaultOpen: false,
      items: [
        { id: 'segment_mark', icon: Hash, label: '边标记' },
        { id: 'congruent', icon: Equal, label: '全等 ≅' },
        { id: 'similar', icon: Percent, label: '相似 ∽' },
        { id: 'text', icon: Type, label: '文字注释' },
        { id: 'measure_length', icon: Ruler, label: '测量长度' },
        { id: 'measure_angle', icon: Triangle, label: '测量角度' },
        { id: 'verify_triangle', icon: CheckSquare, label: '验证三角形' },
      ]
    },
  ];

  // Track which groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    toolGroups.forEach((g, i) => { if (g.defaultOpen) initial.add(i); });
    return initial;
  });

  const toggleGroup = (index: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className={clsx(
      "absolute left-4 top-4 bottom-16 rounded-lg shadow-lg p-2 flex flex-col z-10 overflow-hidden",
      darkTheme ? "bg-gray-800" : "bg-white"
    )}>
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
        {toolGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="mb-1">
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(groupIndex)}
              className={clsx(
                "w-full flex items-center justify-between px-2 py-1 rounded text-xs font-medium",
                darkTheme
                  ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              <span>{group.name}</span>
              {expandedGroups.has(groupIndex)
                ? <ChevronDown size={12} />
                : <ChevronRight size={12} />
              }
            </button>

            {/* Group Items */}
            {expandedGroups.has(groupIndex) && (
              <div className="flex flex-col gap-0.5 mt-1">
                {group.items.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id)}
                    className={clsx(
                      "p-2 rounded-md transition-colors flex items-center gap-2",
                      activeTool === tool.id
                        ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
                        : darkTheme
                          ? "hover:bg-gray-700 text-gray-300"
                          : "hover:bg-gray-100 text-gray-600"
                    )}
                    title={tool.label}
                  >
                    <tool.icon size={18} />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
