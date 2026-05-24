// data.js — 数据模型 + 默认数据 + CRUD 操作

// ===================== 默认数据 =====================
const DEFAULT_MINDMAP = {
  title: "未命名思维导图",
  root: {
    id: "root",
    label: "思维导图",
    content: "# 欢迎使用 Mindmap Blog\n\n- 双击节点或按 F2 编辑标题\n- 右键节点进入下钻\n- 点击节点查看/编辑 Markdown 正文\n- Tab 创建子节点\n- Enter 创建兄弟节点",
    collapsed: false,
    children: [
      {
        id: "c1",
        label: "语言",
        content: "## 编程语言\n\n编程语言是开发者与计算机沟通的工具。",
        collapsed: false,
        children: [
          {
            id: "c1-1",
            label: "Java",
            content: "### Java\n\n```java\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello\");\n    }\n}\n```\n\nJava 是一种广泛使用的面向对象编程语言。",
            collapsed: false,
            children: [
              { id: "c1-1-1", label: "基本语法", content: "变量、数据类型、运算符、控制流……", collapsed: false, children: [] },
              { id: "c1-1-2", label: "面向对象", content: "封装、继承、多态是 Java 面向对象的三大特性。", collapsed: false, children: [] },
              { id: "c1-1-3", label: "集合框架", content: "List、Set、Map 是 Java 最常用的集合接口。", collapsed: false, children: [] }
            ]
          },
          {
            id: "c1-2",
            label: "Python",
            content: "### Python\n\n```python\ndef hello():\n    print(\"Hello, World!\")\n```\n\nPython 以简洁优雅著称。",
            collapsed: false,
            children: [
              { id: "c1-2-1", label: "基本语法", content: "", collapsed: false, children: [] },
              { id: "c1-2-2", label: "常用库", content: "NumPy、Pandas、Matplotlib……", collapsed: false, children: [] }
            ]
          },
          {
            id: "c1-3",
            label: "Go",
            content: "### Go\n\nGo 是 Google 开发的静态类型编译语言，以并发编程和高性能著称。",
            collapsed: false,
            children: []
          }
        ]
      },
      {
        id: "c2",
        label: "工具",
        content: "## 开发工具\n\n选择合适的工具可以大幅提升开发效率。",
        collapsed: false,
        children: [
          { id: "c2-1", label: "Git", content: "### Git\n\n分布式版本控制系统。`git init` `git add` `git commit`", collapsed: false, children: [] },
          { id: "c2-2", label: "Docker", content: "### Docker\n\n容器化技术。`docker run` `docker build`", collapsed: false, children: [] },
          { id: "c2-3", label: "VSCode", content: "### VSCode\n\n轻量级代码编辑器，拥有丰富的插件生态。", collapsed: false, children: [] }
        ]
      },
      {
        id: "c3",
        label: "框架",
        content: "## 常用框架\n\n框架提供了标准化的开发模式和最佳实践。",
        collapsed: false,
        children: [
          { id: "c3-1", label: "Spring Boot", content: "Java 企业级应用框架。", collapsed: false, children: [] },
          { id: "c3-2", label: "Django", content: "Python Web 框架，「全家桶」式开发。", collapsed: false, children: [] },
          { id: "c3-3", label: "Flutter", content: "Google 的跨平台 UI 框架，一套代码多端运行。", collapsed: false, children: [] }
        ]
      }
    ]
  }
};

// ===================== 唯一 ID 生成 =====================
let _idCounter = 100;
function generateId() {
  return 'node-' + (++_idCounter) + '-' + Date.now().toString(36);
}

// ===================== 节点查找 =====================
function findNode(root, id) {
  if (root.id === id) return root;
  if (!root.children) return null;
  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

// ===================== 查找父节点 =====================
function findParent(root, childId) {
  if (!root.children) return null;
  for (let i = 0; i < root.children.length; i++) {
    if (root.children[i].id === childId) return { parent: root, index: i };
    const found = findParent(root.children[i], childId);
    if (found) return found;
  }
  return null;
}

// ===================== 节点路径 =====================
function getNodePath(root, id) {
  if (root.id === id) return [{ id: root.id, label: root.label }];
  if (!root.children) return null;
  for (const child of root.children) {
    const path = getNodePath(child, id);
    if (path) return [{ id: root.id, label: root.label }, ...path];
  }
  return null;
}

// ===================== CRUD =====================
function createChildNode(root, parentId, label = "新节点") {
  const parent = findNode(root, parentId);
  if (!parent) return null;
  if (!parent.children) parent.children = [];
  const node = { id: generateId(), label, content: "", collapsed: false, children: [] };
  parent.children.push(node);
  parent.collapsed = false; // 展开以便看到新节点
  return node;
}

function createSiblingNode(root, nodeId, label = "新节点") {
  // 不能给根节点创建兄弟
  if (nodeId === root.id) return null;
  const result = findParent(root, nodeId);
  if (!result) return null;
  const { parent, index } = result;
  if (!parent.children) parent.children = [];
  const node = { id: generateId(), label, content: "", collapsed: false, children: [] };
  parent.children.splice(index + 1, 0, node);
  return node;
}

function deleteNode(root, nodeId) {
  if (nodeId === root.id) return null; // 不能删除根节点
  const result = findParent(root, nodeId);
  if (!result) return null;
  const { parent, index } = result;
  const deleted = parent.children[index];
  parent.children.splice(index, 1);
  return deleted;
}

function updateNode(root, nodeId, updates) {
  const node = findNode(root, nodeId);
  if (!node) return false;
  if (updates.label !== undefined) node.label = updates.label;
  if (updates.content !== undefined) node.content = updates.content;
  if (updates.collapsed !== undefined) node.collapsed = updates.collapsed;
  return true;
}

function toggleCollapse(root, nodeId) {
  const node = findNode(root, nodeId);
  if (!node || !node.children || node.children.length === 0) return;
  node.collapsed = !node.collapsed;
}

// ===================== 树工具 =====================
function countNodes(root) {
  let count = 1;
  if (root.children) root.children.forEach(c => count += countNodes(c));
  return count;
}

function cloneTree(node) {
  return JSON.parse(JSON.stringify(node));
}

// ===================== 历史（撤销/重做） =====================
let _history = [];
let _historyIndex = -1;
const MAX_HISTORY = 50;

function saveHistory(root) {
  // 清除当前位置之后的历史
  _history = _history.slice(0, _historyIndex + 1);
  _history.push(JSON.parse(JSON.stringify(root)));
  if (_history.length > MAX_HISTORY) _history.shift();
  _historyIndex = _history.length - 1;
}

function undo(root) {
  if (_historyIndex <= 0) return null;
  _historyIndex--;
  return JSON.parse(JSON.stringify(_history[_historyIndex]));
}

function redo(root) {
  if (_historyIndex >= _history.length - 1) return null;
  _historyIndex++;
  return JSON.parse(JSON.stringify(_history[_historyIndex]));
}
