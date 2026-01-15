import { useViewStore } from '../store/viewStore';
import { useToolStore } from '../store/toolStore';
import { PIXELS_PER_UNIT } from '../constants/grid';

const toolLabels: Record<string, string> = {
    select: '选择',
    point: '点',
    line: '线段',
    vector: '向量',
    circle: '圆',
    rectangle: '矩形',
    arc: '弧',
    auxiliary: '辅助线',
    perpendicular: '垂线',
    parallel: '平行线',
    midpoint: '中点',
    incenter: '内心',
    circumcenter: '外心',
    tangent: '切线',
    segment_mark: '边标记',
    congruent: '全等',
    similar: '相似',
    measure_length: '测量长度',
    measure_angle: '测量角度',
    verify_triangle: '验证三角形',
    ellipse: '椭圆',
    parabola: '抛物线',
    template: '模板库',
};

const toolHints: Record<string, string> = {
    select: '点击选择元素，拖拽移动点',
    point: '点击创建点',
    line: '点击两点创建线段',
    vector: '点击两点创建向量',
    circle: '点击圆心，再点击边上的点',
    rectangle: '点击两个对角点',
    arc: '点击圆心、起点、终点',
    auxiliary: '点击两点创建辅助线（灰色虚线）',
    perpendicular: '选择一条线和一个点',
    parallel: '选择一条线和一个点',
    midpoint: '选择一条线段',
    incenter: '选择三角形的三个顶点',
    circumcenter: '选择三角形的三个顶点',
    tangent: '选择圆和圆外的点',
    segment_mark: '点击线段添加标记',
    congruent: '选择两个三角形标记全等 ≅',
    similar: '选择两个三角形标记相似 ∽',
    measure_length: '选择两个点',
    measure_angle: '选择三个点（顶点在中间）',
    verify_triangle: '选择三个点',
    ellipse: '在左下角面板选择定义方式',
    parabola: '在左下角面板选择定义方式',
    template: '在左下角选择模板快速创建图形',
};

export const StatusBar: React.FC = () => {
    const activeTool = useToolStore((state) => state.activeTool);
    const mousePosition = useViewStore((state) => state.mousePosition);

    const toolName = toolLabels[activeTool] || activeTool;
    const hint = toolHints[activeTool] || '';

    // Convert pixel coordinates to mathematical coordinates
    // Divide by PIXELS_PER_UNIT to get grid units, flip Y for math convention (positive Y is up)
    const displayX = mousePosition ? (mousePosition.x / PIXELS_PER_UNIT).toFixed(1) : '-';
    const displayY = mousePosition ? (-mousePosition.y / PIXELS_PER_UNIT).toFixed(1) : '-';

    return (
        <div className="absolute bottom-0 left-0 right-0 bg-gray-800 text-gray-200 text-sm px-4 py-1.5 flex items-center gap-6 z-10">
            <span className="font-medium">
                工具: <span className="text-blue-400">{toolName}</span>
            </span>
            <span className="text-gray-400">|</span>
            <span className="flex-1 text-gray-300">{hint}</span>
            <span className="text-gray-400">|</span>
            <span className="font-mono">
                坐标: ({displayX}, {displayY})
            </span>
        </div>
    );
};
