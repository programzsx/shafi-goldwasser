// keyboard.js — 键盘快捷键系统

function setupKeyboard(state) {
  document.addEventListener('keydown', (e) => {
    // 如果在输入框中，不拦截（除了 Escape）
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      if (e.key === 'Escape') {
        e.target.blur();
        if (typeof state.onCancelEdit === 'function') state.onCancelEdit();
      }
      return;
    }

    const key = e.key;
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    // Escape
    if (key === 'Escape') {
      e.preventDefault();
      if (typeof state.onEscape === 'function') state.onEscape();
      return;
    }

    // Tab — 创建子节点
    if (key === 'Tab' && !ctrl) {
      e.preventDefault();
      if (typeof state.onCreateChild === 'function') state.onCreateChild();
      return;
    }

    // Enter — 创建兄弟节点
    if (key === 'Enter') {
      e.preventDefault();
      if (typeof state.onCreateSibling === 'function') state.onCreateSibling();
      return;
    }

    // F2 — 编辑
    if (key === 'F2') {
      e.preventDefault();
      if (typeof state.onEdit === 'function') state.onEdit();
      return;
    }

    // Delete / Backspace — 删除
    if (key === 'Delete' || key === 'Backspace') {
      e.preventDefault();
      if (typeof state.onDelete === 'function') state.onDelete();
      return;
    }

    // Ctrl+Z — 撤销
    if (ctrl && key === 'z' && !shift) {
      e.preventDefault();
      if (typeof state.onUndo === 'function') state.onUndo();
      return;
    }

    // Ctrl+Shift+Z — 重做
    if (ctrl && key === 'z' && shift) {
      e.preventDefault();
      if (typeof state.onRedo === 'function') state.onRedo();
      return;
    }

    // Ctrl+S — 保存
    if (ctrl && key === 's') {
      e.preventDefault();
      if (typeof state.onSave === 'function') state.onSave();
      return;
    }

    // Ctrl+0 — 重置缩放
    if (ctrl && key === '0') {
      e.preventDefault();
      if (typeof state.onResetZoom === 'function') state.onResetZoom();
      return;
    }

    // Space — 平移模式
    if (key === ' ') {
      e.preventDefault();
      if (typeof state.onSpaceDown === 'function') state.onSpaceDown();
      return;
    }

    // ← → 折叠/展开
    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      e.preventDefault();
      if (typeof state.onCollapse === 'function') state.onCollapse(key === 'ArrowLeft');
      return;
    }

    // / 搜索
    if (key === '/') {
      e.preventDefault();
      if (typeof state.onSearch === 'function') state.onSearch();
      return;
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === ' ') {
      if (typeof state.onSpaceUp === 'function') state.onSpaceUp();
    }
  });
}
