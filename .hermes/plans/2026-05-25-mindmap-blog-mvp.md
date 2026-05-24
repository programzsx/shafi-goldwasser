# Mindmap Blog — 实现计划

> **目标**：在 shafi-goldwasser 仓库中实现一个 Web 思维导图应用，支持无限画布、多层下钻、节点 Markdown 正文、导出为交互式 HTML。

**架构**：纯前端单页应用（HTML + CSS + Vanilla JS），无需构建工具，所有资源内联。画布用 Canvas 2D 自绘，Markdown 用 marked 库渲染。

**数据格式**：JSON 树结构（label + content + children），参考 `zhangshixin/mindmap-spec.md` 第五节数据模型。

---

## Phase 1：项目骨架搭建

### Task 1.1：创建项目文件结构

**目标**：建立 `src/` 源码目录和必要的资源目录

```
shafi-goldwasser/
├── src/
│   ├── index.html          # 主编辑器页面
│   ├── app.js              # 应用程序入口 + 状态管理
│   ├── canvas.js           # Canvas 画布渲染引擎
│   ├── tree-layout.js      # 树形布局算法（从左到右逻辑图）
│   ├── keyboard.js         # 键盘快捷键系统
│   ├── node-panel.js       # 节点详情面板（Markdown 编辑器）
│   ├── drill-down.js       # 下钻状态管理 + 面包屑
│   ├── data.js             # 默认数据 + 数据 CRUD
│   └── export.js           # 导出 HTML / JSON / Markdown
├── zsx-docs/               # 设计文档（已有）
├── zsx-test/               # 测试文件
├── zsx-tools/              # 工具脚本
└── zsx-build-deploy/       # 部署脚本
```

---

## Phase 2：数据模型 + 默认数据

### Task 2.1：定义节点数据结构 + 默认数据

**目标**：实现节点树 CRUD，提供一棵"计算机"主题的默认思维导图数据

**数据结构**：
```javascript
{
  id: string,           // 唯一ID
  label: string,        // 节点标题
  content: string,      // Markdown 正文（可空）
  collapsed: boolean,   // 是否折叠
  children: Node[]      // 子节点
}
```

**API**：
- `createNode(parentId, label)` → 创建子节点
- `createSibling(nodeId, label)` → 创建兄弟节点
- `deleteNode(nodeId)` → 删除节点（含子树）
- `updateNode(nodeId, {label, content})` → 更新节点
- `findNode(root, id)` → 查找节点
- `getNodePath(root, id)` → 获取从根到该节点的路径

---

## Phase 3：Canvas 画布渲染

### Task 3.1：Canvas 基础框架

**目标**：创建 Canvas 画布，支持平移（鼠标拖拽）和缩放（滚轮）

- Canvas 2D context，全窗口尺寸
- 鼠标按下拖拽 → 平移
- 滚轮 → 以鼠标位置为中心缩放（0.3x ~ 3x）
- 窗口 resize 自适应

### Task 3.2：树形布局算法

**目标**：实现从左到右的逻辑图布局

- 递归计算每个节点的宽度（根据 label 文字长度）
- 兄弟节点垂直间距固定（8px）
- 父子节点水平间距固定（48px）
- 返回每个节点的 {x, y, width, height}

### Task 3.3：节点渲染

**目标**：在 Canvas 上绘制节点矩形 + 连线

- 节点矩形：圆角 6px，填充色根据类型
- 连线：直角折线（L 形），从父节点右侧中心到子节点左侧中心
- 文字：节点 label 居中绘制
- 根节点：红色圆角矩形、白色文字、larger font
- 有 content 的节点：右下角红色小圆点

### Task 3.4：交互状态渲染

**目标**：支持 hover/selected/editing 视觉状态

- Hover：边框高亮红色
- Selected：边框加粗 + 背景变浅
- Collapsed：显示 "+N" 标记

---

## Phase 4：节点交互

### Task 4.1：节点点击选中

**目标**：点击节点 → 选中（蓝色边框），点击空白 → 取消选中

- 将 Canvas 坐标转换为世界坐标（考虑平移+缩放）
- Hit test：判断点击是否在节点矩形内
- 只选中一个节点

### Task 4.2：节点编辑（F2 / 双击）

**目标**：F2 或双击节点 → 弹出内联编辑器或输入框

- 在选中节点位置显示 HTML input（overlay 在 Canvas 上）
- Enter → 保存，Esc → 取消
- 自动聚焦并全选文字

### Task 4.3：快捷键创建节点

**目标**：Tab → 创建子节点，Enter → 创建兄弟节点

- 需要先有选中节点
- 新节点默认文字"新节点"
- 创建后自动进入编辑状态
- 自动滚动画布使新节点可见

### Task 4.4：Delete / Backspace 删除节点

**目标**：删除选中节点及其所有子节点

- 如果是根节点则忽略
- 删除后选中父节点
- 自动重绘

---

## Phase 5：下钻功能

### Task 5.1：下钻状态管理

**目标**：管理下钻栈 + 面包屑

- `drillStack = [{nodeId, label}, ...]`
- `drillDown(nodeId)` → push 到栈，重新渲染（以该节点为显示根）
- `drillUp()` → pop 栈
- `drillTo(index)` → 截断栈到指定位置
- `getDisplayRoot()` → 返回当前显示的根节点

### Task 5.2：面包屑导航栏

**目标**：顶部显示完整下钻路径，可点击跳转

- HTML 元素，固定在 Canvas 上方
- 格式：🏠 根节点 > 父节点 > 当前节点
- 点击任意层级返回

### Task 5.3：右键菜单

**目标**：右键节点 → 显示上下文菜单

- 菜单选项：下钻、编辑、删除、复制、粘贴
- 点击菜单外部关闭

---

## Phase 6：节点详情面板

### Task 6.1：右侧抽屉面板

**目标**：点击节点正文区域 / 点击"详情"按钮 → 滑出右侧面板

- CSS transition 动画
- 面板宽度 420px（可拖拽调整）
- 面板内分两个 tab：编辑 / 预览

### Task 6.2：Markdown 编辑器 + 预览

**目标**：面板内可编辑 Markdown 正文

- 编辑 tab：textarea 或简易编辑器
- 预览 tab：marked.js 渲染为 HTML
- 自动保存（debounce 500ms）
- 节点有正文时画布上显示小圆点标记

---

## Phase 7：文件操作 + 导出

### Task 7.1：保存/加载

**目标**：保存为 JSON 文件到本地，从本地 JSON 打开

- 保存：下载 JSON（Blob + a.click()）
- 打开：FileReader 读取 JSON → 解析 → 替换数据并重绘
- 自动保存到 localStorage（备份）

### Task 7.2：导出为 HTML

**目标**：生成独立 HTML 文件，包含完整数据和渲染引擎

- 将当前 mindmap JSON 数据内联到 HTML 中
- 包含简版渲染引擎（canvas.js + drill-down.js 的精简版）
- 支持：树形渲染、下钻、面包屑、节点详情查看
- 单文件、无外部依赖、可离线浏览

### Task 7.3：导出为 Markdown

**目标**：将树形结构转为缩进 Markdown 大纲

```
# 计算机
  ## 语言
    ### Java
    ### Python
  ## 框架
```

---

## Phase 8：打磨

### Task 8.1：键盘快捷键覆盖

**目标**：完善所有快捷键

| 快捷键 | 功能 |
|--------|------|
| Tab | 创建子节点 |
| Enter | 创建兄弟节点 |
| F2 | 编辑节点 |
| Delete/Backspace | 删除节点 |
| Ctrl+Z | 撤销 |
| Ctrl+Shift+Z | 重做 |
| Ctrl+C/V/X | 复制/粘贴/剪切 |
| Esc | 取消编辑 / 上钻 |
| Space+拖拽 | 平移画布 |
| Ctrl+滚轮 | 缩放 |
| Ctrl+0 | 重置缩放 |
| ←/→ | 折叠/展开 |

### Task 8.2：撤销/重做

**目标**：实现操作历史栈

- 每次修改数据后 push snapshot 到历史栈
- Ctrl+Z → pop → 恢复上一个状态
- 保留 50 步历史

### Task 8.3：节点折叠/展开

**目标**：点击折叠图标或按 ← → 折叠/展开子节点

- 节点左侧显示折叠按钮（▶ / ▼）
- 折叠后子节点隐藏，显示 "+N"
- 布局实时重算

---

## 技术选型

| 层 | 技术 | 理由 |
|----|------|------|
| 语言 | Vanilla JavaScript (ES6+) | 零依赖、体积小、导出 HTML 时无需打包 |
| 渲染 | Canvas 2D API | 性能优于 DOM/SVG（大量节点时），完全控制绘制 |
| Markdown | marked.js (CDN) | 轻量、成熟、解析速度快 |
| 存储 | localStorage + JSON 文件 | 本地优先、无需后端 |
| 导出 | Blob + a.click() | 纯前端下载、无服务端依赖 |
| 样式 | CSS Variables + 手动编写 | 无框架依赖、导出 HTML 内联方便 |

## 不做的（MVP 范围外）

- 家族图谱（数据结构完全不同，需要独立的模块）
- 拖拽调整节点关系（交互复杂，后期迭代）
- 多人协作 / 云端同步
- Mini Map 鸟瞰图
- 暗色/亮色主题切换（先只做亮色）
- 节点形状自定义
- 导入 XMind / Freemind 格式
