已定位到一个非常典型、且足以直接导致 Vite 白屏的运行时错误：

- 在 [VerifyPanel.tsx](file:///Users/qadmlee/cmblab/mathpad/src/components/VerifyPanel.tsx#L1-L6) 第 4 行，你写的是 `import { PointElement } from '../types/geoElements';`
- 但 `PointElement` 在 [geoElements.ts](file:///Users/qadmlee/cmblab/mathpad/src/types/geoElements.ts#L31-L36) 是 TypeScript 的 `interface`（纯类型），运行时并不会产生真实导出。
- 结果是在运行时模块加载阶段直接抛错：模块“不提供名为 PointElement 的导出”，页面就会白屏。

## 修复计划
1. **修正 VerifyPanel 的类型导入**
   - 将 `import { PointElement } ...` 改为 `import type { PointElement } ...`。

2. **全局排查同类问题（一次性避免再白屏）**
   - 搜索所有从 `../types/geoElements` / `./types/geoElements` 的“值导入”用法。
   - 对所有只用于类型的导入统一改为 `import type { ... }`。

3. **验证**
   - 刷新页面确认不再白屏。
   - 重点验证：函数面板/视图面板/属性面板/画布渲染是否恢复。

我将按以上步骤直接修复并验证。