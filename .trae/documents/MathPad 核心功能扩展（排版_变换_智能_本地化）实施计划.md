## 目标与约束
- **目标**：在不牺牲“3 分钟内完成配图”的前提下，补齐面向国内中高考/教研的关键能力：试卷排版与导出、几何变换快捷工具、基础关系识别与智能标注建议、中文数学符号与更符合国内习惯的交互。
- **约束**：界面保持简洁（学习成本 <30 分钟），输出符合国内印刷规范（清晰线宽/字号/留白/黑白友好），与现有 Zustand + Konva 架构兼容。

## 现状总结（基于代码调研）
- 已有：PNG/JSON 导出（[ViewPanel.tsx](file:///Users/qadmlee/cmblab/mathpad/src/components/ViewPanel.tsx)）、网格/坐标轴开关（[viewStore.ts](file:///Users/qadmlee/cmblab/mathpad/src/store/viewStore.ts)）、角度/边标记渲染（[Angle.tsx](file:///Users/qadmlee/cmblab/mathpad/src/components/elements/Angle.tsx)、[SegmentMark.tsx](file:///Users/qadmlee/cmblab/mathpad/src/components/elements/SegmentMark.tsx)）、吸附（[snapping.ts](file:///Users/qadmlee/cmblab/mathpad/src/core/snapping.ts)）、基础快捷键（[useKeyboardShortcuts.ts](file:///Users/qadmlee/cmblab/mathpad/src/hooks/useKeyboardShortcuts.ts)）、右键菜单但仅点元素触发（[Point.tsx](file:///Users/qadmlee/cmblab/mathpad/src/components/elements/Point.tsx)、[ContextMenu.tsx](file:///Users/qadmlee/cmblab/mathpad/src/components/ContextMenu.tsx)）。
- 缺口：打印/答题卡式输出、导出裁剪/版式模板、变换工具（对称/旋转/缩放）、关系自动识别与建议、中文符号/公式编辑器、右键菜单覆盖更多元素与画布空白处。

## 2. 试卷排版增强（优先级最高）
### 2.1 “试卷模式”导出设置（统一输出规范）
- 新增一个 **ExportPreset** 概念：A4/16K/答题卡框、DPI、线宽/字体、是否显示网格/坐标轴、黑白模式、留白。
- 在现有 PNG 导出基础上扩展为：
  - **内容裁剪导出**：计算图形包围盒（遍历元素几何边界）+ 统一边距。
  - **版式导出**：输出到固定画布尺寸（按 DPI 转换），自动居中/缩放到安全区域。
- 交付：在 [ViewPanel.tsx](file:///Users/qadmlee/cmblab/mathpad/src/components/ViewPanel.tsx) 增加“试卷导出”小节，1～2 个预设按钮（例如“题干图”“答题卡图”）。

### 2.2 自动标注系统（考试排版风格）
- 增加“标注预设（Exam Annotation Presets）”
  - 辅助线：默认灰色虚线、线宽 1～1.5、可一键隐藏
  - 角度/直角：统一橙色/黑白友好、标注位置避免遮挡
  - 边标记：统一大小与间距
- 交互：在右侧/底部增加一个极简开关“试卷标注风格”，一键把当前图形的 style 映射到规范（不改几何，仅改样式）。

## 3. 教学效率工具（几何变换快捷操作）
### 3.1 变换目标与安全策略
- 以“**选中的自由点**”为最小安全单位（避免破坏依赖链）。
- 若选择的是线/圆/椭圆等：自动收集其依赖的点（父点）作为变换对象。
- 派生点/派生对象：默认不直接改（或提供“转为自由对象”高级选项，后续迭代）。

### 3.2 变换操作（第一版）
- 平移：按向量（dx,dy）
- 旋转：绕点（cx,cy）旋转 θ
- 缩放：绕点（cx,cy）缩放 k
- 对称：关于一条直线对称（选择一条线作为轴）
- UI：在右侧属性面板或新增一个轻量“变换”面板，仅在有 selection 时显示。

## 4. 智能化辅助（关系识别 + 标注建议）
### 4.1 基础关系识别（可解释、可关闭）
- 实现一个轻量 Analyzer（仅读 elements）：
  - 近似平行/垂直：基于方向向量夹角阈值
  - 近似等长：基于长度差阈值
  - 近似相切：圆-线/圆-圆距离关系阈值
- 输出为“建议列表”：例如“检测到 AB ⟂ CD，是否添加直角标记？”

### 4.2 智能标注建议系统
- 在右下角/右侧栏增加“建议”区（最多显示 3 条，避免信息噪音）。
- 点击建议：自动创建对应的标注元素（segment_mark / angle / auxiliary 等），并采用试卷风格。

## 6. 本地化增强（中文符号库 + 右键菜单/快捷键）
### 6.1 中文数学符号库
- 在“文字注释”工具中加入符号面板：常用集合/角度/全等相似/箭头/上下标字符等（先做纯文本插入，保证轻量）。
- 统一输入体验：符号点击即插入，常用模板（“∠ABC=”“⊥”“∥”）。

### 6.2 右键菜单与快捷键设置
- 右键菜单覆盖：点/线/圆/椭圆/抛物线/双曲线等元素都支持右键（当前只有点支持）。
- 画布空白处右键：提供“取消选择/重置视图/导出/显示网格坐标轴”等快捷入口。
- 快捷键设置：第一版提供“默认方案 + 自定义少量关键键位”（工具切换、导出、试卷模式开关、辅助线显示）。

## 测试与验收（贯穿每项功能）
- **单元测试**：
  - 几何边界计算、内容裁剪、版式缩放策略
  - 变换矩阵与点变换正确性
  - 关系识别阈值与稳定性（回归测试）
- **可视化测试（轻量）**：
  - 生成几组固定场景 JSON，导出 PNG 与基线图像做像素差比较（或至少保留人工核对脚本）
- **集成测试**：`npm run build` 必须通过；导出链路不报错。

## 代码组织与接口设计
- 新增 `src/core/layout/`：导出裁剪、版式模板、包围盒计算
- 新增 `src/core/transform/`：点/向量/矩阵运算与选区收集
- 新增 `src/core/analyzer/`：关系识别与建议生成
- 状态扩展：在 viewStore 或单独 store 中加入 `examMode/exportPreset/suggestionsEnabled` 等轻量状态。

## 交付顺序（按你列的优先级）
1) 试卷导出与标注风格（最快带来“印刷规范”价值）
2) 变换工具（提升教学效率）
3) 关系识别 + 建议（可选开关，避免噪音）
4) 中文符号库 + 右键/快捷键增强（提升本地化体验）

如果你确认这个实施计划，我将从“2. 试卷排版增强功能”开始落地：先做内容裁剪 + 版式导出预设 + 一键试卷风格，然后再逐步接入变换与智能建议。