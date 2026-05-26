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

  // 性能优化
  _layoutDirty: true,       // 脏标记：为 true 时需要重新布局
  _rafId: null,              // requestAnimationFrame ID
  _lastRenderTime: 0,        // 上次渲染时间（用于帧率限制）

  // 触摸状态
  _touches: {},
  _touchPinchStart: null,    // 双指缩放起始距离
  _touchPinchZoom: null,     // 双指缩放起始 zoom
  _touchPinchPan: null,      // 双指缩放起始 pan
  _lastTapTime: 0,           // 上次点击时间（用于双击检测）
  _lastTapPos: null,         // 上次点击位置
};

// ===================== 初始化 =====================
function initApp() {
  // 加载数据（带版本检查）
  const savedRaw = localStorage.getItem('mindmap-data');
  let useDefault = true;
  if (savedRaw) {
    try {
      const saved = JSON.parse(savedRaw);
      // 版本不匹配则丢弃旧数据
      if (saved._version === DATA_VERSION) {
        state.mindmap = saved;
        useDefault = false;
      }
    } catch (e) { /* 数据损坏，用默认 */ }
  }
  if (useDefault) {
    state.mindmap = JSON.parse(JSON.stringify(DEFAULT_MINDMAP));
    state.mindmap._version = DATA_VERSION;
  }

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
    onSpaceDown: () => { state.isSpaceDown = true; document.getElementById('canvasContainer').style.cursor = 'grab'; },
    onSpaceUp: () => { state.isSpaceDown = false; if (!state.isPanning) document.getElementById('canvasContainer').style.cursor = 'default'; },
    onCollapse: handleCollapse,
    onSearch: () => document.getElementById('searchInput')?.focus(),
    onCancelEdit: cancelEdit,
  });

  // 面包屑回调
  onDrillChange = () => { state.selectedNodeId = getDisplayRoot(state.mindmap.root).id; closePanel(); scheduleRender(true); };
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
    scheduleRender(false); // content 变化不影响节点尺寸
  };
  onPanelClosed = () => { state.selectedNodeId = null; scheduleRender(false); };

  // 画布事件
  setupCanvasEvents();

  // 保存初始历史
  saveHistory(state.mindmap.root);

  // 初始渲染：同步渲染确保 _hitRect 立即可用（首次点击前）
  state.selectedNodeId = state.mindmap.root.id;
  resizeCanvas();
  renderNow();
  window.addEventListener('resize', () => { resizeCanvas(); scheduleRender(true); });
}

// ===================== 渲染调度（核心优化） =====================
// scheduleRender(true)  → 结构变了，需要重新布局
// scheduleRender(false) → 仅视觉变化（选中/hover/zoom/pan），跳过布局
function scheduleRender(needsLayout) {
  if (needsLayout) {
    state._layoutDirty = true;
    clearTextCache();  // 标签可能变了，清宽度缓存
  }
  // 用 rAF 防抖：多次请求合并为一次
  if (state._rafId === null) {
    state._rafId = requestAnimationFrame(() => {
      state._rafId = null;
      doRender();
    });
  }
}

// 立即同步渲染（仅用于输入框定位等必须同步的场景）
function renderNow() {
  if (state._rafId !== null) {
    cancelAnimationFrame(state._rafId);
    state._rafId = null;
  }
  doRender();
}

function doRender() {
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

  // 布局：只在脏时重算
  const root = getDisplayRoot(state.mindmap.root);
  if (root) {
    if (state._layoutDirty) {
      doLayout(root, ctx);
      state._layoutDirty = false;
    }
    renderTree(ctx, root, {
      selectedNodeId: state.selectedNodeId,
      hoveredNodeId: state.hoveredNodeId,
      displayRoot: getDisplayRoot(state.mindmap.root),
    });
  }

  ctx.restore();

  // 绘制点击标记（调试用绿点，1 秒后消失）
  if (state._clickMarker && Date.now() - state._clickMarker.t < 1000) {
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(state._clickMarker.x, state._clickMarker.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(state._clickMarker.x, state._clickMarker.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

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

  // 更新状态栏
  updateStatusBar();
}

function updateStatusBar() {
  document.getElementById('nodeCount').textContent =
    '共 ' + countNodes(getDisplayRoot(state.mindmap.root)) + ' 个节点';
  document.getElementById('zoomInfo').textContent = Math.round(state.zoom * 100) + '%';
}

// ===================== Canvas 事件 =====================
function setupCanvasEvents() {
  // 把所有事件挂在 container div 上（而非 canvas），更可靠
  const container = document.getElementById('canvasContainer');

  // --- 鼠标事件 ---
  // mousedown: 只处理平移和折叠按钮（不处理编辑）
  container.addEventListener('mousedown', (e) => {
    // 如果正在编辑中，点击输入框外 → 先提交编辑
    if (state.editingNodeId && e.target !== state.editInput) {
      commitEdit();
    }

    if (e.button === 1 || state.isSpaceDown || (e.button === 0 && e.altKey)) {
      state.isPanning = true;
      state.panStart = { x: e.clientX - state.panX, y: e.clientY - state.panY };
      container.style.cursor = 'grabbing';
      return;
    }

    if (e.button === 0) {
      const world = screenToWorld(e.clientX, e.clientY, state);
      const root = getDisplayRoot(state.mindmap.root);
      const hit = hitTest(world.x, world.y, root);

      // 折叠按钮
      if (hit && hit.hitCollapse) {
        toggleCollapse(state.mindmap.root, hit.node.id);
        saveHistory(state.mindmap.root);
        saveToLocalStorage();
        scheduleRender(true);
      }
    }
  });

  // click: 单击节点 → 编辑（比 mousedown 更可靠）
  container.addEventListener('click', (e) => {
    // 加点击标记（调试用：在点击位置画小绿点）
    state._clickMarker = { x: e.clientX, y: e.clientY, t: Date.now() };
    scheduleRender(false);

    const world = screenToWorld(e.clientX, e.clientY, state);
    const root = getDisplayRoot(state.mindmap.root);
    const hit = hitTest(world.x, world.y, root);

    if (hit && !hit.hitCollapse) {
      // 单击任意节点 → 直接编辑
      state.selectedNodeId = hit.node.id;
      startEdit(hit.node.id);
    } else if (!hit) {
      // 点击空白 → 取消选中
      state.selectedNodeId = null;
      scheduleRender(false);
    }
  });

  container.addEventListener('mousemove', (e) => {
    if (state.isPanning) {
      state.panX = e.clientX - state.panStart.x;
      state.panY = e.clientY - state.panStart.y;
      scheduleRender(false);
      return;
    }

    // Hover 检测：只在真正变化时才触发渲染
    const world = screenToWorld(e.clientX, e.clientY, state);
    const root = getDisplayRoot(state.mindmap.root);
    const hit = hitTest(world.x, world.y, root);
    const newHover = hit && !hit.hitCollapse ? hit.node.id : null;
    if (newHover !== state.hoveredNodeId) {
      state.hoveredNodeId = newHover;
      container.style.cursor = newHover ? 'pointer' : (state.isSpaceDown ? 'grab' : 'default');
      scheduleRender(false);
    }
  });

  container.addEventListener('mouseup', () => {
    state.isPanning = false;
    container.style.cursor = state.isSpaceDown ? 'grab' : (state.hoveredNodeId ? 'pointer' : 'default');
  });

  container.addEventListener('mouseleave', () => {
    state.isPanning = false;
    if (state.hoveredNodeId !== null) {
      state.hoveredNodeId = null;
      container.style.cursor = 'default';
      scheduleRender(false);
    }
  });

  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(3, Math.max(0.3, state.zoom * delta));

    const mx = e.clientX;
    const my = e.clientY;
    state.panX = mx - (mx - state.panX) * (newZoom / state.zoom);
    state.panY = my - (my - state.panY) * (newZoom / state.zoom);
    state.zoom = newZoom;
    scheduleRender(false);
  }, { passive: false });

  // 右键 → 下钻
  container.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const world = screenToWorld(e.clientX, e.clientY, state);
    const root = getDisplayRoot(state.mindmap.root);
    const hit = hitTest(world.x, world.y, root);
    if (hit && !hit.hitCollapse) {
      showContextMenu(e.clientX, e.clientY, hit.node.id, hit.node.id === state.mindmap.root.id);
    }
  });

  // 双击保留作为备用
  container.addEventListener('dblclick', (e) => {
    const world = screenToWorld(e.clientX, e.clientY, state);
    const root = getDisplayRoot(state.mindmap.root);
    const hit = hitTest(world.x, world.y, root);
    if (hit && !hit.hitCollapse) {
      state.selectedNodeId = hit.node.id;
      startEdit(hit.node.id);
    }
  });

  // --- 触摸事件（移动端支持） ---
  container.addEventListener('touchstart', onTouchStart, { passive: false });
  container.addEventListener('touchmove', onTouchMove, { passive: false });
  container.addEventListener('touchend', onTouchEnd, { passive: false });
}

// ===================== 触摸支持 =====================
function onTouchStart(e) {
  e.preventDefault();
  const touches = e.touches;

  if (touches.length === 1) {
    // 单指：平移 或 点击
    state._touches.single = {
      id: touches[0].identifier,
      startX: touches[0].clientX,
      startY: touches[0].clientY,
      startPanX: state.panX,
      startPanY: state.panY,
      moved: false,
    };
  } else if (touches.length === 2) {
    // 双指：缩放+平移
    state._touches.single = null; // 取消单指
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    state._touchPinchStart = Math.sqrt(dx * dx + dy * dy);
    state._touchPinchZoom = state.zoom;
    state._touchPinchPan = { x: state.panX, y: state.panY };
    state._touchPinchMid = {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  }
}

function onTouchMove(e) {
  e.preventDefault();
  const touches = e.touches;

  if (touches.length === 1 && state._touches.single) {
    const t = state._touches.single;
    const dx = touches[0].clientX - t.startX;
    const dy = touches[0].clientY - t.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      t.moved = true;
      state.panX = t.startPanX + dx;
      state.panY = t.startPanY + dy;
      scheduleRender(false);
    }
  } else if (touches.length === 2 && state._touchPinchStart) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const midX = (touches[0].clientX + touches[1].clientX) / 2;
    const midY = (touches[0].clientY + touches[1].clientY) / 2;

    // 缩放
    const scale = dist / state._touchPinchStart;
    const newZoom = Math.min(3, Math.max(0.3, state._touchPinchZoom * scale));

    // 以中点为中心缩放
    const prevMid = state._touchPinchMid;
    state.panX = midX - (prevMid.x - state._touchPinchPan.x) * (newZoom / state._touchPinchZoom);
    state.panY = midY - (prevMid.y - state._touchPinchPan.y) * (newZoom / state._touchPinchZoom);
    state.zoom = newZoom;

    scheduleRender(false);
  }
}

function onTouchEnd(e) {
  // 单指点击检测
  if (state._touches.single && !state._touches.single.moved) {
    const t = state._touches.single;
    const now = Date.now();

    // 双击检测（300ms 内同一位置）
    if (state._lastTapTime && (now - state._lastTapTime) < 300 &&
        state._lastTapPos &&
        Math.abs(t.startX - state._lastTapPos.x) < 20 &&
        Math.abs(t.startY - state._lastTapPos.y) < 20) {
      // 双击 → 编辑
      const world = screenToWorld(t.startX, t.startY, state);
      const root = getDisplayRoot(state.mindmap.root);
      const hit = hitTest(world.x, world.y, root);
      if (hit && !hit.hitCollapse) {
        state.selectedNodeId = hit.node.id;
        startEdit(hit.node.id);
        scheduleRender(false);
      }
      state._lastTapTime = 0;
      state._lastTapPos = null;
    } else {
      // 单击
      const world = screenToWorld(t.startX, t.startY, state);
      const root = getDisplayRoot(state.mindmap.root);
      const hit = hitTest(world.x, world.y, root);

      if (hit && hit.hitCollapse) {
        toggleCollapse(state.mindmap.root, hit.node.id);
        saveHistory(state.mindmap.root);
        saveToLocalStorage();
        scheduleRender(true);
      } else if (hit) {
        state.selectedNodeId = hit.node.id;
        scheduleRender(false);
        if (isPanelOpen()) {
          const fullNode = findNode(state.mindmap.root, hit.node.id);
          if (fullNode) openPanel(fullNode.id, fullNode.label, fullNode.content);
        }
      } else {
        state.selectedNodeId = null;
        scheduleRender(false);
      }

      state._lastTapTime = now;
      state._lastTapPos = { x: t.startX, y: t.startY };
    }
  }

  // 长按 → 右键菜单（800ms）
  // (已通过单指不动检测实现，这里简化处理)

  state._touches.single = null;
  state._touchPinchStart = null;
}

// ===================== 编辑节点 =====================
function startEdit(nodeId) {
  const node = findNode(state.mindmap.root, nodeId);
  if (!node) return;

  // 安全移除旧输入框（可能已被 blur 事件移除）
  if (state.editInput) {
    try { state.editInput.remove(); } catch(e) { /* 已被移除 */ }
    state.editInput = null;
  }
  state.editingNodeId = nodeId;
  // 确保布局是最新的
  if (state._layoutDirty) {
    doLayout(getDisplayRoot(state.mindmap.root), state.ctx);
    state._layoutDirty = false;
  }

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
    border: 3px solid #1565C0; border-radius: ${isRoot ? LAYOUT.rootBorderRadius : LAYOUT.borderRadius}px;
    padding: 0 ${LAYOUT.nodePaddingX}px; font-size: ${node._size.fontSize}px;
    font-family: -apple-system, "Segoe UI", "PingFang SC", sans-serif;
    font-weight: 600; outline: none; z-index: 100; box-sizing: border-box;
    box-shadow: 0 0 0 3px rgba(21,101,192,0.25);
    color: ${isRoot ? '#fff' : '#212121'}; background: ${isRoot ? '#C62828' : '#fff'};
  `;
  document.getElementById('canvasContainer').appendChild(input);
  input.focus();
  input.select();
  state.editInput = input;

  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') commitEdit();
    else if (e.key === 'Escape') cancelEdit();
  });
  // 不用 blur 自动提交——改为点击画布空白时提交（逻辑在 mousedown handler 中）
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
  scheduleRender(true); // 标签变化需要重新布局
}

// ===================== 操作处理 =====================
function handleEscape() {
  if (isPanelOpen()) {
    closePanel();
  } else if (drillStack.length > 0) {
    drillUp();
    scheduleRender(true);
  }
}

function handleCreateChild() {
  if (!state.selectedNodeId) return;
  const newNode = createChildNode(state.mindmap.root, state.selectedNodeId);
  if (newNode) {
    saveHistory(state.mindmap.root);
    saveToLocalStorage();
    state.selectedNodeId = newNode.id;
    scheduleRender(true);
    startEdit(newNode.id);
  }
}

function handleCreateSibling() {
  if (!state.selectedNodeId || state.selectedNodeId === getDisplayRoot(state.mindmap.root).id) {
    handleCreateChild();
    return;
  }
  const newNode = createSiblingNode(state.mindmap.root, state.selectedNodeId);
  if (newNode) {
    saveHistory(state.mindmap.root);
    saveToLocalStorage();
    state.selectedNodeId = newNode.id;
    scheduleRender(true);
    startEdit(newNode.id);
  }
}

function handleEdit() {
  // 如果没选中任何节点，自动选中显示根节点
  if (!state.selectedNodeId) {
    state.selectedNodeId = getDisplayRoot(state.mindmap.root).id;
  }
  startEdit(state.selectedNodeId);
}

function handleDelete() {
  // Backspace: 如果在子画布，先返回上级而非删除
  if (drillStack.length > 0) {
    drillUp();
    scheduleRender(true);
    return;
  }
  if (!state.selectedNodeId) return;
  const deleted = deleteNode(state.mindmap.root, state.selectedNodeId);
  if (deleted) {
    saveHistory(state.mindmap.root);
    saveToLocalStorage();
    state.selectedNodeId = null;
    closePanel();
    scheduleRender(true);
  }
}

function handleUndo() {
  const restored = undo(state.mindmap.root);
  if (restored) {
    state.mindmap.root = restored;
    state.selectedNodeId = null;
    closePanel();
    saveToLocalStorage();
    scheduleRender(true);
  }
}

function handleRedo() {
  const restored = redo(state.mindmap.root);
  if (restored) {
    state.mindmap.root = restored;
    state.selectedNodeId = null;
    closePanel();
    saveToLocalStorage();
    scheduleRender(true);
  }
}

function handleSave() {
  saveToLocalStorage();
  exportJSON(state.mindmap);
}

function handleResetZoom() {
  state.zoom = 1;
  fitToScreen();
  scheduleRender(false);
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
  scheduleRender(true);
}

function handleContextAction(action, nodeId) {
  switch (action) {
    case 'edit':
      state.selectedNodeId = nodeId;
      startEdit(nodeId);
      break;
    case 'drill':
      if (drillDown(state.mindmap.root, nodeId)) {
        // 自动选中显示根节点，让用户可以直接 Tab/Enter
        state.selectedNodeId = getDisplayRoot(state.mindmap.root).id;
        closePanel();
        scheduleRender(true);
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

// ===================== Canvas 尺寸 =====================
function resizeCanvas() {
  const container = document.getElementById('canvasContainer');
  state.canvas.width = container.clientWidth;
  state.canvas.height = container.clientHeight;
  if (!state._initialFit) {
    state._initialFit = true;
    setTimeout(() => fitToScreen(), 100);
  }
}

function fitToScreen() {
  const root = getDisplayRoot(state.mindmap.root);
  if (!root) return;
  if (state._layoutDirty) {
    doLayout(root, state.ctx);
    state._layoutDirty = false;
  }
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
  state.mindmap._version = DATA_VERSION;
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
    scheduleRender(true);
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
        state.selectedNodeId = data.root.id;
        closePanel();
        saveHistory(state.mindmap.root);
        saveToLocalStorage();
        fitToScreen();
        scheduleRender(true);
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
    state.selectedNodeId = state.mindmap.root.id;
    closePanel();
    saveHistory(state.mindmap.root);
    saveToLocalStorage();
    fitToScreen();
    scheduleRender(true);
  }
}

// ===================== 启动 =====================
window.addEventListener('DOMContentLoaded', initApp);
