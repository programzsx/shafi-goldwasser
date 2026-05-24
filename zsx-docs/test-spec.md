# Mindmap Blog — 测试方案

> 版本：1.0 | 日期：2026-05-25

---

## 一、测试范围

### 1.1 架构说明

本项目为**纯前端单页应用**，无后端服务。所有逻辑运行在浏览器中，依赖：
- DOM API（Canvas、localStorage、事件系统）
- 无外部框架（Vanilla JS）

### 1.2 测试模块

| 模块 | 文件 | 类型 | 测试方式 |
|------|------|------|----------|
| 数据模型 | `src/data.js` | 纯逻辑 + localStorage | Node.js (jsdom polyfill) |
| 树形布局 | `src/tree-layout.js` | Canvas 依赖 | Node.js (jsdom + canvas mock) |
| 画布渲染 | `src/canvas.js` | Canvas 2D 依赖 | 浏览器集成测试 |
| 下钻管理 | `src/drill-down.js` | DOM 依赖 | Node.js (jsdom) |
| 节点面板 | `src/node-panel.js` | DOM 大量依赖 | 浏览器集成测试 |
| 快捷键 | `src/keyboard.js` | 事件系统依赖 | 浏览器集成测试 |
| 导出功能 | `src/export.js` | Blob/FileReader | Node.js (mock) + 浏览器 |
| 主应用 | `src/app.js` | 全依赖 | 浏览器集成测试 |

### 1.3 测试分层

```
Level 1: 单元测试（Node.js + jsdom）
  └── data.js, tree-layout.js, export.js, drill-down.js

Level 2: 集成测试（浏览器环境）
  └── 完整应用流程：创建→编辑→下钻→导出→打开
```

---

## 二、测试策略

### 2.1 单元测试 — data.js

| 用例ID | 测试项 | 输入 | 期望输出 |
|--------|--------|------|----------|
| DATA-01 | findNode 查找存在的节点 | root, "c1-1-1" | {id:"c1-1-1", label:"基本语法"} |
| DATA-02 | findNode 查找不存在的节点 | root, "nonexist" | null |
| DATA-03 | findParent 查找父节点 | root, "c1-1" | {parent:..., index:0} |
| DATA-04 | findParent 根节点无父 | root, "root" | null |
| DATA-05 | getNodePath 完整路径 | root, "c1-1-1" | [root, c1, c1-1, c1-1-1] |
| DATA-06 | createChildNode 创建子节点 | root, "c1" | 返回新节点，父节点 children+1 |
| DATA-07 | createChildNode 给不存在的父 | root, "bad" | null |
| DATA-08 | createSiblingNode 创建兄弟 | root, "c1-1" | 在 c1-1 后插入新节点 |
| DATA-09 | createSiblingNode 根禁止 | root, "root" | null |
| DATA-10 | deleteNode 删除节点 | root, "c1-1-1" | 返回被删除节点，父节点 children-1 |
| DATA-11 | deleteNode 根禁止删除 | root, "root" | null |
| DATA-12 | updateNode 更新label | root, "c1", {label:"新名称"} | node.label==="新名称" |
| DATA-13 | updateNode 更新content | root, "c1", {content:"正文"} | node.content==="正文" |
| DATA-14 | toggleCollapse 切换折叠 | root, "c1" | collapsed 取反 |
| DATA-15 | countNodes 统计节点数 | root | 18 |
| DATA-16 | saveHistory + undo | 修改→undo | 恢复到修改前状态 |
| DATA-17 | saveHistory + redo | undo→redo | 恢复到修改后状态 |
| DATA-18 | generateId 唯一性 | 100次调用 | 无重复ID |

### 2.2 单元测试 — tree-layout.js

| 用例ID | 测试项 | 输入 | 期望输出 |
|--------|--------|------|----------|
| LAY-01 | doLayout 根节点有坐标 | simple tree | root._x===0, root._y有值 |
| LAY-02 | doLayout 子节点在父右侧 | simple tree | child._x > root._x |
| LAY-03 | doLayout 兄弟节点y递增 | simple tree | 兄弟间_y递增 |
| LAY-04 | doLayout 折叠的节点不布局子节点 | collapsed tree | 折叠节点子节点无坐标 |
| LAY-05 | calcNodeSize 根节点字体更大 | root node | size.fontSize === 15 |
| LAY-06 | calcNodeSize 普通节点字体 | normal node | size.fontSize === 13 |
| LAY-07 | measureText 返回正数 | ctx, "hello" | width > 0 |

### 2.3 单元测试 — export.js

| 用例ID | 测试项 | 输入 | 期望输出 |
|--------|--------|------|----------|
| EXP-01 | exportJSON 生成合法JSON | DEFAULT_MINDMAP | JSON.parse 不抛异常，有 root |
| EXP-02 | exportMarkdown 包含标题 | root | 输出包含 "# 思维导图" |
| EXP-03 | exportMarkdown 包含节点正文 | root | 输出包含节点 content |
| EXP-04 | exportHTML 包含完整结构 | DEFAULT_MINDMAP | 含 <!DOCTYPE>, mindmap 数据 |
| EXP-05 | exportHTML 嵌入的JSON可解析 | DEFAULT_MINDMAP | 嵌入数据 === 原始数据 |

### 2.4 单元测试 — drill-down.js

| 用例ID | 测试项 | 输入 | 期望输出 |
|--------|--------|------|----------|
| DRL-01 | drillDown 下钻到子节点 | nodeId="c1" | stack长度=1, displayRoot=c1 |
| DRL-02 | drillUp 返回上级 | 有stack→drillUp | stack长度-1 |
| DRL-03 | drillUp 栈空无操作 | 空stack→drillUp | stack长度=0, 返回false |
| DRL-04 | drillTo(-1) 回到根 | 有stack→drillTo(-1) | stack=[] |
| DRL-05 | drillTo(1) 截断到指定 | 3层stack→drillTo(1) | stack长度=2 |
| DRL-06 | getDisplayRoot 默认返回根 | 空stack | === root |

### 2.5 集成测试（浏览器）

| 用例ID | 测试项 | 操作步骤 | 期望结果 |
|--------|--------|----------|----------|
| INT-01 | 页面加载 | 打开 index.html | 画布显示思维导图，根节点可见 |
| INT-02 | 选中节点 | 点击"语言"节点 | 节点高亮（红色边框） |
| INT-03 | 双击编辑 | 双击"语言"节点→输入"编程语言"→Enter | 节点文字变为"编程语言" |
| INT-04 | Tab创建子节点 | 选中"语言"→按Tab | "语言"下新增"新节点" |
| INT-05 | Enter创建兄弟 | 选中子节点→按Enter | 同级新增"新节点" |
| INT-06 | Delete删除 | 选叶子节点→按Del | 节点消失 |
| INT-07 | 右键下钻 | 右键"语言"→点"下钻" | 画布只显示"语言"及其子节点 |
| INT-08 | 面包屑返回 | 下钻后点面包屑第一级 | 回到根视图 |
| INT-09 | Backspace返回 | 下钻后按Backspace | 返回上级画布 |
| INT-10 | 点击节点开面板 | 点击"Java" | 右侧面板打开，显示Java正文 |
| INT-11 | 面板编辑保存 | 面板中输入文→自动保存 | localStorage 更新 |
| INT-12 | Esc关面板 | 面板打开→按Esc | 面板关闭 |
| INT-13 | 导出JSON | 点导出→JSON | 下载 .json 文件 |
| INT-14 | 导出HTML | 点导出→HTML | 下载 .html 文件（可独立打开） |
| INT-15 | 撤销操作 | 编辑→Ctrl+Z | 恢复到编辑前 |
| INT-16 | 搜索节点 | 在搜索框输入"Java"→回车 | 画布聚焦到Java节点 |

---

## 三、测试环境

- **Node.js**: 用于运行单元测试（jsdom 模拟 DOM）
- **浏览器**: Chrome/Firefox 用于集成测试
- **测试框架**: 自写轻量断言库（无外部依赖）

## 四、通过标准

- 所有单元测试 100% 通过
- 所有集成测试 100% 通过
- 测试报告记录每个用例的结果、耗时、失败原因
