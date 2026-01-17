import React, { useState } from 'react';
import {
  MousePointer2,
  Circle,
  Ruler,
  Triangle,
  Square,
  MoveDiagonal,
  Type,
  ChevronDown,
  ChevronRight,
  Dot,
  Crosshair,
  CircleDotDashed,
  Target,
  Hash,
  FunctionSquare,
  Scale,
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

// Straight line icon (no endpoints, extends beyond)
const StraightLineIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
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
    <line x1="2" y1="20" x2="22" y2="4" />
  </svg>
);

// Perpendicular icon (inverted T shape)
const PerpendicularIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
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
    {/* Horizontal line */}
    <line x1="4" y1="18" x2="20" y2="18" />
    {/* Vertical line */}
    <line x1="12" y1="4" x2="12" y2="18" />
  </svg>
);

// Parallel icon (two vertical lines - solid and dashed)
const ParallelIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
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
    {/* Left solid line */}
    <line x1="8" y1="4" x2="8" y2="20" />
    {/* Right dashed line */}
    <line x1="16" y1="4" x2="16" y2="20" strokeDasharray="4 3" />
  </svg>
);

// Tangent icon (circle with touching line)
const TangentIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
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
    <circle cx="10" cy="12" r="6" />
    <line x1="16" y1="4" x2="16" y2="20" />
  </svg>
);

// Dashed line icon for auxiliary lines
const DashedLineIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeDasharray="4 3"
    className={className}
  >
    <line x1="2" y1="20" x2="22" y2="4" />
  </svg>
);

// Similar triangles icon (one large, one small triangle)
const SimilarTrianglesIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
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
    {/* Large triangle (left) */}
    <polygon points="2,20 10,4 18,20" fill="none" />
    {/* Small triangle (right) */}
    <polygon points="14,20 18,12 22,20" fill="none" />
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
        { id: 'line', icon: SegmentIcon, label: '线段 (L)', shortcut: 'L' },
        { id: 'straight_line', icon: StraightLineIcon, label: '直线' },
        { id: 'auxiliary', icon: DashedLineIcon, label: '辅助线' },
        { id: 'vector', icon: MoveDiagonal, label: '向量', shortcut: 'V' },
        { id: 'circle', icon: Circle, label: '圆 (C)', shortcut: 'C' },
        { id: 'ellipse', icon: EllipseIcon, label: '椭圆', shortcut: 'E' },
        { id: 'parabola', icon: ParabolaIcon, label: '抛物线', shortcut: 'P' },
        { id: 'hyperbola', icon: HyperbolaIcon, label: '双曲线', shortcut: 'H' },
        { id: 'rectangle', icon: Square, label: '矩形 (R)', shortcut: 'R' },
        { id: 'triangle', icon: Triangle, label: '三角形 (T)', shortcut: 'T' },
      ]
    },
    // Construction
    {
      name: '构造',
      defaultOpen: true,
      items: [
        { id: 'function', icon: FunctionSquare, label: '函数图像' },
        { id: 'perpendicular', icon: PerpendicularIcon, label: '垂线' },
        { id: 'parallel', icon: ParallelIcon, label: '平行线' },
        { id: 'tangent', icon: TangentIcon, label: '切线' },
        { id: 'midpoint', icon: Crosshair, label: '中点' },
        { id: 'congruent', icon: Scale, label: '全等三角形' },
        { id: 'similar', icon: SimilarTrianglesIcon, label: '相似三角形' },
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
        { id: 'text', icon: Type, label: '文字注释' },
        { id: 'measure_length', icon: Ruler, label: '测量长度' },
        { id: 'measure_angle', icon: Triangle, label: '测量角度' },
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
                    onClick={(e) => {
                      setActiveTool(tool.id);
                      // Track button Y position for panel placement
                      const toolsWithPanels = ['ellipse', 'parabola', 'hyperbola', 'congruent', 'similar'];
                      if (toolsWithPanels.includes(tool.id)) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        useViewStore.getState().setToolPanelY(rect.top);
                      }
                    }}
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
