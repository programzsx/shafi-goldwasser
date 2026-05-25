// keyboard.js — 键盘快捷键系统

function setupKeyboard(callbacks) {
  document.addEventListener('keydown', (e) => {
    try {
      // 如果在输入框中，不拦截（除了 Escape）
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') {
          e.target.blur();
          if (typeof callbacks.onCancelEdit === 'function') callbacks.onCancelEdit();
        }
        return;
      }

      const key = e.key;
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      // Escape
      if (key === 'Escape') {
        e.preventDefault();
        if (typeof callbacks.onEscape === 'function') callbacks.onEscape();
        return;
      }

      // Tab — 创建子节点
      if (key === 'Tab' && !ctrl) {
        e.preventDefault();
        if (typeof callbacks.onCreateChild === 'function') callbacks.onCreateChild();
        return;
      }

      // Enter — 创建兄弟节点
      if (key === 'Enter') {
        e.preventDefault();
        if (typeof callbacks.onCreateSibling === 'function') callbacks.onCreateSibling();
        return;
      }

      // F2 或 Ctrl+E — 编辑
      if (key === 'F2' || (ctrl && key === 'e')) {
        e.preventDefault();
        if (typeof callbacks.onEdit === 'function') callbacks.onEdit();
        return;
      }

      // Delete — 删除
      if (key === 'Delete') {
        e.preventDefault();
        if (typeof callbacks.onDelete === 'function') callbacks.onDelete();
        return;
      }

      // Backspace — 返回上级/删除
      if (key === 'Backspace') {
        e.preventDefault();
        if (typeof callbacks.onDelete === 'function') callbacks.onDelete();
        return;
      }

      // Ctrl+Z — 撤销
      if (ctrl && key === 'z' && !shift) {
        e.preventDefault();
        if (typeof callbacks.onUndo === 'function') callbacks.onUndo();
        return;
      }

      // Ctrl+Shift+Z — 重做
      if (ctrl && key === 'z' && shift) {
        e.preventDefault();
        if (typeof callbacks.onRedo === 'function') callbacks.onRedo();
        return;
      }

      // Ctrl+S — 保存
      if (ctrl && key === 's') {
        e.preventDefault();
        if (typeof callbacks.onSave === 'function') callbacks.onSave();
        return;
      }

      // Ctrl+0 — 重置缩放
      if (ctrl && key === '0') {
        e.preventDefault();
        if (typeof callbacks.onResetZoom === 'function') callbacks.onResetZoom();
        return;
      }

      // Space — 平移模式
      if (key === ' ') {
        e.preventDefault();
        if (typeof callbacks.onSpaceDown === 'function') callbacks.onSpaceDown();
        return;
      }

      // ← → 折叠/展开
      if (key === 'ArrowLeft' || key === 'ArrowRight') {
        e.preventDefault();
        if (typeof callbacks.onCollapse === 'function') callbacks.onCollapse(key === 'ArrowLeft');
        return;
      }

      // / 搜索
      if (key === '/') {
        e.preventDefault();
        if (typeof callbacks.onSearch === 'function') callbacks.onSearch();
        return;
      }
    } catch (err) {
      console.error('keyboard handler error:', err);
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === ' ') {
      if (typeof callbacks.onSpaceUp === 'function') callbacks.onSpaceUp();
    }
  });
}
