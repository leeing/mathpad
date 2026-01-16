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

// Construction step hints for multi-step tools
const constructionStepHints: Record<string, string[]> = {
    line: ['点击起点', '点击终点'],
    vector: ['点击起点', '点击终点'],
    circle: ['点击圆心', '点击圆上一点'],
    arc: ['点击圆心', '点击起点', '点击终点'],
    auxiliary: ['点击起点', '点击终点'],
    incenter: ['选择第1个顶点', '选择第2个顶点', '选择第3个顶点'],
    circumcenter: ['选择第1个顶点', '选择第2个顶点', '选择第3个顶点'],
    verify_triangle: ['选择第1个顶点', '选择第2个顶点', '选择第3个顶点'],
    measure_angle: ['选择第1个点', '选择顶点（角的顶点）', '选择第3个点'],
    ellipse_foci: ['点击第1个焦点', '点击第2个焦点', '点击椭圆上一点'],
    ellipse_center: ['点击中心', '点击长轴端点', '点击短轴方向'],
    parabola_focus_directrix: ['点击焦点', '点击准线上一点'],
    parabola_vertex_focus: ['点击顶点', '点击焦点'],
};

const defaultHints: Record<string, string> = {
    select: '点击选择元素，拖拽移动点',
    point: '点击创建点',
    midpoint: '点击线段获取中点',
    segment_mark: '点击线段添加标记',
    perpendicular: '选择一条线和一个点',
    parallel: '选择一条线和一个点',
    ellipse: '在左下角面板选择定义方式',
    parabola: '在左下角面板选择定义方式',
    template: '在左下角选择模板快速创建图形',
};

export const StatusBar: React.FC = () => {
    const activeTool = useToolStore((state) => state.activeTool);
    const tempIds = useToolStore((state) => state.tempIds);
    const ellipseMode = useToolStore((state) => state.ellipseMode);
    const parabolaMode = useToolStore((state) => state.parabolaMode);
    const mousePosition = useViewStore((state) => state.mousePosition);

    const toolName = toolLabels[activeTool] || activeTool;

    // Determine dynamic hint based on tool and construction step
    const getDynamicHint = (): string => {
        // Map tool+mode to step hints key (use string for composite keys)
        let hintKey: string = activeTool;
        if (activeTool === 'ellipse') {
            if (ellipseMode === 'foci') hintKey = 'ellipse_foci';
            else if (ellipseMode === 'center') hintKey = 'ellipse_center';
            else return '使用面板输入参数，点击"+"创建';
        }
        if (activeTool === 'parabola') {
            if (parabolaMode === 'focus_directrix') hintKey = 'parabola_focus_directrix';
            else if (parabolaMode === 'vertex_focus') hintKey = 'parabola_vertex_focus';
            else return '使用面板输入参数，点击"+"创建';
        }

        const steps = constructionStepHints[hintKey];
        if (steps) {
            const currentStep = tempIds.length; // tempIds.length = completed steps
            const totalSteps = steps.length;
            if (currentStep < totalSteps) {
                return `步骤 ${currentStep + 1}/${totalSteps}：${steps[currentStep]}`;
            }
        }

        return defaultHints[activeTool] || '';
    };

    const hint = getDynamicHint();

    // Convert pixel coordinates to mathematical coordinates
    const displayX = mousePosition ? (mousePosition.x / PIXELS_PER_UNIT).toFixed(1) : '-';
    const displayY = mousePosition ? (-mousePosition.y / PIXELS_PER_UNIT).toFixed(1) : '-';

    return (
        <div className="absolute bottom-0 left-0 right-0 bg-gray-800 text-gray-200 text-sm px-4 py-1.5 flex items-center gap-6 z-10">
            <span className="font-medium">
                工具: <span className="text-blue-400">{toolName}</span>
            </span>
            <span className="text-gray-400">|</span>
            <span className="flex-1 text-yellow-300">{hint}</span>
            <span className="text-gray-400">|</span>
            <span className="font-mono">
                坐标: ({displayX}, {displayY})
            </span>
        </div>
    );
};
