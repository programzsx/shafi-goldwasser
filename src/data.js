// data.js — 数据模型 + 默认数据 + CRUD 操作

// 数据版本：升级时旧数据自动清理
const DATA_VERSION = 2;

// ===================== 默认数据 =====================
const DEFAULT_MINDMAP = {
  title: "未命名思维导图",
  root: {
    id: "root",
    label: "新思维导图",
    content: "",
    collapsed: false,
    children: []
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
