// app.js — 主应用入口：状态管理 + 流程编排

// ===================== 全局状态 =====================
const state = {
  mindmap: null,
  canvas: null,
  ctx: null,
  selectedNodeId: null,
  hoveredNodeId: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  isPanning: false,
  isSpaceDown: false,
  panStart: { x: 0, y: 0 },
  editingNodeId: null,
  editInput: null,
};

// ===================== 初始化 =====================
function initApp() {
  // 加载数据
  const saved = localStorage.getItem('mindmap-data');
  state.mindmap = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_MINDMAP));

  // Canvas 初始化
  state.canvas = document.getElementById('mindmapCanvas');
  state.ctx = state.canvas.getContext('2d');

  // 键盘快捷键
  setupKeyboard({
    onEscape: handleEscape,
    onCreateChild: handleCreateChild,
    onCreateSibling: handleCreateSibling,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onSave: handleSave,
    onResetZoom: handleResetZoom,
    onSpaceDown: () => { state.isSpaceDown = true; state.canvas.style.cursor = 'grab'; },
    onSpaceUp: () => { state.isSpaceDown = false; if (!state.isPanning) state.canvas.style.cursor = 'default'; },
    onCollapse: handleCollapse,
    onSearch: () => document.getElementById('searchInput')?.focus(),
    onCancelEdit: cancelEdit,
  });

  // 面包屑回调
  onDrillChange = () => { state.selectedNodeId = null; closePanel(); render(); };
  onContextAction = handleContextAction;
  getNodeChildren = (nodeId) => {
    const node = findNode(getDisplayRoot(state.mindmap.root), nodeId);
    return node && node.children ? node.children.length : 0;
  };

  // 面板回调
  onPanelContentChange = (nodeId, content) => {
    updateNode(state.mindmap.root, nodeId, { content });
    saveHistory(state.mindmap.root);
    saveToLocalStorage();
    render();
  };
  onPanelClosed = () => { state.selectedNodeId = null; render(); };

  // 画布事件
  setupCanvasEvents();

  // 保存初始历史
  saveHistory(state.mindmap.root);

  // 初始渲染
  resizeCanvas();
  window.addEventListener('resize', () => { resizeCanvas(); render(); });
  render();
}

// ===================== Canvas 事件 =====================
function setupCanvasEvents() {
  const c = state.canvas;

  c.addEventListener('mousedown', (e) => {
    if (e.button === 1 || state.isSpaceDown || (e.button === 0 && e.altKey)) {
      // 中键 / Space+左键 / Alt+左键 → 平移
      state.isPanning = true;
      state.panStart = { x: e.clientX - state.panX, y: e.clientY - state.panY };
      c.style.cursor = 'grabbing';
      return;
    }

    if (e.button === 0) {
      // 左键 → 点击检测
      const world = screenToWorld(e.clientX, e.clientY, state);
      const root = getDisplayRoot(state.mindmap.root);
      const hit = hitTest(world.x, world.y, root);

      if (hit && hit.hitCollapse) {
        // 点击折叠按钮
        toggleCollapse(state.mindmap.root, hit.node.id);
        saveHistory(state.mindmap.root);
        saveToLocalStorage();
        render();
        return;
      }

      if (hit) {
        state.selectedNodeId = hit.node.id;
        render();
        // 如果面板已打开，更新面板
        if (isPanelOpen()) {
          const fullNode = findNode(state.mindmap.root, hit.node.id);
          if (fullNode) openPanel(fullNode.id, fullNode.label, fullNode.content);
        }
      } else {
        state.selectedNodeId = null;
        // 如果点击空白区域+面板打开，关闭面板
        // （面板点击已打开时点击空白不关闭，用户可能在看面板内容）
        render();
      }
    }
  });

  c.addEventListener('mousemove', (e) => {
    if (state.isPanning) {
      state.panX = e.clientX - state.panStart.x;
      state.panY = e.clientY - state.panStart.y;
      render();
      return;
    }

    // Hover 检测
    const world = screenToWorld(e.clientX, e.clientY, state);
    const root = getDisplayRoot(state.mindmap.root);
    const hit = hitTest(world.x, world.y, root);
    const prevHover = state.hoveredNodeId;
    state.hoveredNodeId = hit && !hit.hitCollapse ? hit.node.id : null;
    if (prevHover !== state.hoveredNodeId) {
      c.style.cursor = state.hoveredNodeId ? 'pointer' : (state.isSpaceDown ? 'grab' : 'default');
      render();
    }
  });

  c.addEventListener('mouseup', () => {
    state.isPanning = false;
    c.style.cursor = state.isSpaceDown ? 'grab' : (state.hoveredNodeId ? 'pointer' : 'default');
  });

  c.addEventListener('mouseleave', () => {
    state.isPanning = false;
    state.hoveredNodeId = null;
    c.style.cursor = 'default';
    render();
  });

  c.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(3, Math.max(0.3, state.zoom * delta));

    // 以鼠标位置为中心缩放
    const mx = e.clientX;
    const my = e.clientY;
    state.panX = mx - (mx - state.panX) * (newZoom / state.zoom);
    state.panY = my - (my - state.panY) * (newZoom / state.zoom);
    state.zoom = newZoom;
    render();
  }, { passive: false });

  // 右键 → 下钻
  c.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const world = screenToWorld(e.clientX, e.clientY, state);
    const root = getDisplayRoot(state.mindmap.root);
    const hit = hitTest(world.x, world.y, root);
    if (hit && !hit.hitCollapse) {
      showContextMenu(e.clientX, e.clientY, hit.node.id, hit.node.id === state.mindmap.root.id);
    }
  });

  // 双击 → 编辑
  c.addEventListener('dblclick', (e) => {
    const world = screenToWorld(e.clientX, e.clientY, state);
    const root = getDisplayRoot(state.mindmap.root);
    const hit = hitTest(world.x, world.y, root);
    if (hit && !hit.hitCollapse) {
      state.selectedNodeId = hit.node.id;
      startEdit(hit.node.id);
      render();
    }
  });
}

// ===================== 编辑节点 =====================
function startEdit(nodeId) {
  const node = findNode(state.mindmap.root, nodeId);
  if (!node) return;
  state.editingNodeId = nodeId;

  // 移除旧输入框
  if (state.editInput) state.editInput.remove();

  // 创建 overlay 输入框
  const worldX = node._x * state.zoom + state.panX;
  const worldY = node._y * state.zoom + state.panY;
  const w = node._size.w * state.zoom;
  const h = node._size.h * state.zoom;
  const isRoot = node.id === getDisplayRoot(state.mindmap.root).id;

  const input = document.createElement('input');
  input.type = 'text';
  input.value = node.label;
  input.style.cssText = `
    position: absolute; left: ${worldX}px; top: ${worldY}px; width: ${w}px; height: ${h}px;
    border: 2px solid #1565C0; border-radius: ${isRoot ? LAYOUT.rootBorderRadius : LAYOUT.borderRadius}px;
    padding: 0 ${LAYOUT.nodePaddingX}px; font-size: ${node._size.fontSize}px;
    font-family: -apple-system, "Segoe UI", "PingFang SC", sans-serif;
    font-weight: 600; outline: none; z-index: 100; box-sizing: border-box;
    color: ${isRoot ? '#fff' : '#212121'}; background: ${isRoot ? '#E53935' : '#fff'};
  `;
  document.getElementById('canvasContainer').appendChild(input);
  input.focus();
  input.select();
  state.editInput = input;

  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      commitEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  });
  input.addEventListener('blur', () => commitEdit());
}

function commitEdit() {
  if (!state.editingNodeId || !state.editInput) return;
  const val = state.editInput.value.trim();
  if (val) {
    updateNode(state.mindmap.root, state.editingNodeId, { label: val });
    saveHistory(state.mindmap.root);
    saveToLocalStorage();
  }
  cancelEdit();
}

function cancelEdit() {
  if (state.editInput) {
    state.editInput.remove();
    state.editInput = null;
  }
  state.editingNodeId = null;
  render();
}

// ===================== 操作处理 =====================
function handleEscape() {
  if (isPanelOpen()) {
    closePanel();
  } else if (drillStack.length > 0) {
    drillUp();
    render();
  }
}

function handleCreateChild() {
  if (!state.selectedNodeId) return;
  const newNode = createChildNode(state.mindmap.root, state.selectedNodeId);
  if (newNode) {
    saveHistory(state.mindmap.root);
    saveToLocalStorage();
    state.selectedNodeId = newNode.id;
    render();
    startEdit(newNode.id);
  }
}

function handleCreateSibling() {
  if (!state.selectedNodeId || state.selectedNodeId === getDisplayRoot(state.mindmap.root).id) {
    // 如果在根节点上，创建子节点
    handleCreateChild();
    return;
  }
  const newNode = createSiblingNode(state.mindmap.root, state.selectedNodeId);
  if (newNode) {
    saveHistory(state.mindmap.root);
    saveToLocalStorage();
    state.selectedNodeId = newNode.id;
    render();
    startEdit(newNode.id);
  }
}

function handleEdit() {
  if (state.selectedNodeId) {
    startEdit(state.selectedNodeId);
  }
}

function handleDelete() {
  if (!state.selectedNodeId) return;
  const deleted = deleteNode(state.mindmap.root, state.selectedNodeId);
  if (deleted) {
    saveHistory(state.mindmap.root);
    saveToLocalStorage();
    state.selectedNodeId = null;
    closePanel();
    render();
  }
}

function handleUndo() {
  const restored = undo(state.mindmap.root);
  if (restored) {
    state.mindmap.root = restored;
    state.selectedNodeId = null;
    closePanel();
    saveToLocalStorage();
    render();
  }
}

function handleRedo() {
  const restored = redo(state.mindmap.root);
  if (restored) {
    state.mindmap.root = restored;
    state.selectedNodeId = null;
    closePanel();
    saveToLocalStorage();
    render();
  }
}

function handleSave() {
  saveToLocalStorage();
  exportJSON(state.mindmap);
}

function handleResetZoom() {
  state.zoom = 1;
  fitToScreen();
  render();
}

function handleCollapse(collapse) {
  if (!state.selectedNodeId) return;
  const node = findNode(state.mindmap.root, state.selectedNodeId);
  if (!node || !node.children || node.children.length === 0) return;
  if (collapse && !node.collapsed) {
    toggleCollapse(state.mindmap.root, state.selectedNodeId);
  } else if (!collapse && node.collapsed) {
    toggleCollapse(state.mindmap.root, state.selectedNodeId);
  }
  saveHistory(state.mindmap.root);
  saveToLocalStorage();
  render();
}

function handleContextAction(action, nodeId) {
  switch (action) {
    case 'edit':
      state.selectedNodeId = nodeId;
      startEdit(nodeId);
      break;
    case 'drill':
      if (drillDown(state.mindmap.root, nodeId)) {
        state.selectedNodeId = null;
        closePanel();
        render();
      }
      break;
    case 'copy':
      state.selectedNodeId = nodeId;
      break;
    case 'delete':
      state.selectedNodeId = nodeId;
      handleDelete();
      break;
    case 'collapse':
      state.selectedNodeId = nodeId;
      const node = findNode(state.mindmap.root, nodeId);
      if (node) handleCollapse(!node.collapsed);
      break;
  }
}

// ===================== Canvas 渲染 =====================
function render() {
  const c = state.canvas;
  const ctx = state.ctx;
  const w = c.width;
  const h = c.height;

  // 清屏
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = CANVAS.bgColor;
  ctx.fillRect(0, 0, w, h);

  // 变换
  ctx.save();
  ctx.translate(state.panX, state.panY);
  ctx.scale(state.zoom, state.zoom);

  // 布局 + 渲染
  const root = getDisplayRoot(state.mindmap.root);
  if (root) {
    doLayout(root, ctx);
    renderTree(ctx, root, {
      selectedNodeId: state.selectedNodeId,
      hoveredNodeId: state.hoveredNodeId,
      displayRoot: getDisplayRoot(state.mindmap.root),
    });
  }

  ctx.restore();

  // 更新面包屑
  renderBreadcrumb(state.mindmap.root);

  // 更新编辑输入框位置
  if (state.editingNodeId && state.editInput) {
    const node = findNode(state.mindmap.root, state.editingNodeId);
    if (node) {
      const worldX = node._x * state.zoom + state.panX;
      const worldY = node._y * state.zoom + state.panY;
      state.editInput.style.left = worldX + 'px';
      state.editInput.style.top = worldY + 'px';
      state.editInput.style.width = (node._size.w * state.zoom) + 'px';
      state.editInput.style.height = (node._size.h * state.zoom) + 'px';
    }
  }
}

function resizeCanvas() {
  const container = document.getElementById('canvasContainer');
  state.canvas.width = container.clientWidth;
  state.canvas.height = container.clientHeight;
  // 初始居中
  if (!state._initialFit) {
    state._initialFit = true;
    setTimeout(() => fitToScreen(), 100);
  }
}

function fitToScreen() {
  const root = getDisplayRoot(state.mindmap.root);
  if (!root) return;
  doLayout(root, state.ctx);
  const bounds = getBounds(root);
  const w = state.canvas.width;
  const h = state.canvas.height;
  const treeW = bounds.maxX - bounds.minX + 100;
  const treeH = bounds.maxY - bounds.minY + 100;
  const scaleX = w / treeW;
  const scaleY = h / treeH;
  state.zoom = Math.min(scaleX, scaleY, 1.5);
  state.panX = (w - treeW * state.zoom) / 2 - bounds.minX * state.zoom + 50;
  state.panY = (h - treeH * state.zoom) / 2 - bounds.minY * state.zoom + 50;
}

// ===================== 持久化 =====================
function saveToLocalStorage() {
  localStorage.setItem('mindmap-data', JSON.stringify(state.mindmap));
}

// ===================== 搜索 =====================
function searchNodes(query) {
  const results = [];
  function walk(node, path) {
    const cp = path ? path + ' › ' + node.label : node.label;
    const q = query.toLowerCase();
    if (node.label.toLowerCase().includes(q) || (node.content && node.content.toLowerCase().includes(q))) {
      results.push({ node, path: cp });
    }
    if (node.children) node.children.forEach(c => walk(c, cp));
  }
  walk(state.mindmap.root, '');
  return results;
}

function handleSearch() {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) return;
  const results = searchNodes(q);
  if (results.length > 0) {
    const sel = results[0];
    // 重建 drill stack
    drillStack = [];
    const parts = sel.path.split(' › ');
    let current = state.mindmap.root;
    for (let i = 1; i < parts.length; i++) {
      if (current.children) {
        const found = current.children.find(c => c.label === parts[i]);
        if (found) {
          drillStack.push({ nodeId: found.id, label: found.label });
          current = found;
        }
      }
    }
    state.selectedNodeId = sel.node.id;
    render();
    openPanel(sel.node.id, sel.node.label, sel.node.content);
  }
}

// ===================== 加载文件 =====================
function handleFileOpen() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = await loadFromFile(file);
      if (data.root) {
        state.mindmap = data;
        drillStack = [];
        state.selectedNodeId = null;
        closePanel();
        saveHistory(state.mindmap.root);
        saveToLocalStorage();
        fitToScreen();
        render();
      } else {
        alert('无效的思维导图文件格式');
      }
    } catch (err) {
      alert('文件读取失败：' + err.message);
    }
  };
  input.click();
}

// ===================== 导出 =====================
function handleExport(format) {
  switch (format) {
    case 'json': exportJSON(state.mindmap); break;
    case 'html': exportHTML(state.mindmap); break;
    case 'md': exportMarkdown(state.mindmap.root); break;
  }
}

function handleNew() {
  if (confirm('创建新的思维导图？未保存的更改将丢失。')) {
    state.mindmap = JSON.parse(JSON.stringify(DEFAULT_MINDMAP));
    drillStack = [];
    state.selectedNodeId = null;
    closePanel();
    saveHistory(state.mindmap.root);
    saveToLocalStorage();
    fitToScreen();
    render();
  }
}

// ===================== 启动 =====================
window.addEventListener('DOMContentLoaded', initApp);
