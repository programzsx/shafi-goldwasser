// drill-down.js — 下钻状态管理 + 面包屑 + 右键菜单

// ===================== 下钻状态 =====================
let drillStack = []; // [{nodeId, label}]

function getDisplayRoot(root) {
  if (drillStack.length === 0) return root;
  const last = drillStack[drillStack.length - 1];
  return findNode(root, last.nodeId) || root;
}

function drillDown(root, nodeId) {
  const node = findNode(root, nodeId);
  if (!node) return false;
  drillStack.push({ nodeId: node.id, label: node.label });
  return true;
}

function drillUp() {
  if (drillStack.length === 0) return false;
  drillStack.pop();
  return true;
}

function drillTo(index) {
  if (index < 0) {
    drillStack = [];
    return;
  }
  drillStack = drillStack.slice(0, index + 1);
}

// ===================== 面包屑 =====================
function renderBreadcrumb(root) {
  const el = document.getElementById('breadcrumb');
  if (!el) return;

  let html = `<span>🏠</span> `;
  html += `<a href="#" data-drill="-1">${root.label}</a>`;

  drillStack.forEach((s, i) => {
    html += ` <span>›</span> `;
    if (i === drillStack.length - 1) {
      html += `<a href="#" data-drill="${i}" class="current">${s.label}</a>`;
    } else {
      html += `<a href="#" data-drill="${i}">${s.label}</a>`;
    }
  });

  el.innerHTML = html;

  // 绑定点击事件
  el.querySelectorAll('a[data-drill]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const idx = parseInt(a.dataset.drill);
      drillTo(idx);
      if (typeof onDrillChange === 'function') onDrillChange();
    });
  });
}

// ===================== 右键菜单 =====================
let contextMenuEl = null;

function createContextMenu() {
  if (contextMenuEl) return;
  contextMenuEl = document.createElement('div');
  contextMenuEl.id = 'contextMenu';
  contextMenuEl.style.cssText = `
    position:fixed; display:none; background:#fff; border:1px solid #e0e0e0;
    border-radius:8px; box-shadow:0 4px 16px rgba(0,0,0,0.12); z-index:1000;
    padding:4px 0; min-width:140px; font-size:13px;
  `;
  document.body.appendChild(contextMenuEl);
  document.addEventListener('click', () => hideContextMenu());
}

function showContextMenu(x, y, nodeId, isRoot) {
  createContextMenu();

  const items = [
    { label: '✏️ 编辑', action: 'edit', key: 'F2' },
    { label: '⬇ 下钻', action: 'drill', key: '右键', disabled: false },
    { label: '📋 复制', action: 'copy', key: 'Ctrl+C' },
    { label: '🗑️ 删除', action: 'delete', key: 'Del', disabled: isRoot },
    { label: '📁 折叠/展开', action: 'collapse', key: '← →', disabled: !hasChildren() },
  ];

  let html = '';
  items.forEach(item => {
    const cls = item.disabled ? 'style="color:#ccc;cursor:default"' : '';
    html += `<div class="ctx-item" data-action="${item.action}" ${cls}>
      <span>${item.label}</span>
      <span style="color:#999;font-size:11px;margin-left:auto">${item.key}</span>
    </div>`;
  });

  contextMenuEl.innerHTML = html;
  contextMenuEl.style.display = 'block';
  contextMenuEl.style.left = Math.min(x, window.innerWidth - 160) + 'px';
  contextMenuEl.style.top = Math.min(y, window.innerHeight - 200) + 'px';
  contextMenuEl.setAttribute('data-node-id', nodeId);

  // 绑定点击
  contextMenuEl.querySelectorAll('.ctx-item').forEach(item => {
    if (item.dataset.action === 'disabled') return;
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      const id = contextMenuEl.getAttribute('data-node-id');
      hideContextMenu();
      if (typeof onContextAction === 'function') onContextAction(action, id);
    });
  });

  function hasChildren() {
    // 由外部注入判断
    if (typeof getNodeChildren === 'function') {
      return getNodeChildren(nodeId) > 0;
    }
    return false;
  }
}

function hideContextMenu() {
  if (contextMenuEl) contextMenuEl.style.display = 'none';
}

// 回调钩子（由 app.js 设置）
let onDrillChange = null;
let onContextAction = null;
let getNodeChildren = null;
