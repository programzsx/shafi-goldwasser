// canvas.js — Canvas 渲染引擎

const CANVAS = {
  bgColor: '#F5F5F5',
  nodeBg: '#FFFFFF',
  nodeBorder: '#E0E0E0',
  rootBg: '#E53935',
  rootBgSelected: '#C62828',     // 根节点选中时深一点
  rootText: '#FFFFFF',
  textColor: '#212121',
  linkColor: '#BDBDBD',
  hoverBorder: '#E53935',
  selectBorder: '#E53935',
  selectBg: '#FFF0F0',
  dotColor: '#E53935',
  collapseBg: '#9E9E9E',
};

function renderTree(ctx, node, state) {
  if (!node) return;

  const { selectedNodeId, hoveredNodeId, displayRoot } = state;
  const isSelected = node.id === selectedNodeId;
  const isHovered = node.id === hoveredNodeId;

  // 绘制连线
  if (node.children && !node.collapsed) {
    for (const child of node.children) {
      drawLink(ctx, node, child);
    }
  }

  // 绘制节点
  drawNode(ctx, node, isSelected, isHovered, displayRoot && node.id === displayRoot.id);

  // 递归绘制子节点
  if (node.children && !node.collapsed) {
    for (const child of node.children) {
      renderTree(ctx, child, state);
    }
  }
}

function drawLink(ctx, parent, child) {
  const px = parent._x + parent._size.w;
  const py = parent._cy;
  const cx = child._x;
  const cy = child._cy;

  ctx.beginPath();
  ctx.strokeStyle = CANVAS.linkColor;
  ctx.lineWidth = 1.5;

  // L 形折线
  const midX = px + (cx - px) / 2;
  ctx.moveTo(px, py);
  ctx.lineTo(midX, py);
  ctx.lineTo(midX, cy);
  ctx.lineTo(cx, cy);
  ctx.stroke();
}

function drawNode(ctx, node, isSelected, isHovered, isDisplayRoot) {
  const { _x: x, _y: y, _size: size } = node;

  // 确定样式
  const isRoot = isDisplayRoot;
  let bg = CANVAS.nodeBg;
  let borderColor = CANVAS.nodeBorder;
  let textColor = CANVAS.textColor;
  let borderWidth = 1;

  if (isRoot) {
    if (isSelected) {
      bg = CANVAS.rootBgSelected;
      borderColor = '#FF6F60';
      borderWidth = 3;
    } else {
      bg = CANVAS.rootBg;
      borderWidth = 0;
    }
    textColor = CANVAS.rootText;
  } else if (isSelected) {
    bg = CANVAS.selectBg;
    borderColor = CANVAS.selectBorder;
    borderWidth = 2;
  } else if (isHovered) {
    borderColor = CANVAS.hoverBorder;
    borderWidth = 1.5;
  }

  const r = isRoot ? LAYOUT.rootBorderRadius : LAYOUT.borderRadius;

  // 绘制背景
  ctx.beginPath();
  roundRect(ctx, x, y, size.w, size.h, r);
  ctx.fillStyle = bg;
  ctx.fill();

  // 绘制边框
  if (borderWidth > 0) {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.stroke();
  }

  // 绘制文字
  ctx.fillStyle = textColor;
  ctx.font = `600 ${size.fontSize}px -apple-system, "Segoe UI", "PingFang SC", sans-serif`;
  ctx.textBaseline = 'middle';

  const textX = x + LAYOUT.nodePaddingX;
  const textY = y + size.h / 2;
  // 截断过长文字
  const maxTextWidth = size.w - LAYOUT.nodePaddingX * 2 - (size.hasContent ? 12 : 0);
  let displayLabel = node.label;
  let labelWidth = ctx.measureText(displayLabel).width;
  if (labelWidth > maxTextWidth) {
    while (labelWidth > maxTextWidth - 12 && displayLabel.length > 2) {
      displayLabel = displayLabel.slice(0, -1);
      labelWidth = ctx.measureText(displayLabel + '…').width;
    }
    displayLabel += '…';
  }
  ctx.fillText(displayLabel, textX, textY);

  // 有正文标记 — 右下角小圆点
  if (size.hasContent && !isRoot) {
    ctx.beginPath();
    ctx.arc(x + size.w - 7, y + size.h - 7, 3, 0, Math.PI * 2);
    ctx.fillStyle = CANVAS.dotColor;
    ctx.fill();
  }

  // 折叠标记
  if (node.children && node.children.length > 0 && !isRoot) {
    const cx = x + size.w + 6;
    const cy = y + size.h / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = node.collapsed ? '#E53935' : '#FFF';
    ctx.fill();
    ctx.strokeStyle = '#E53935';
    ctx.lineWidth = 1;
    ctx.stroke();
    // 折叠图标
    ctx.fillStyle = node.collapsed ? '#FFF' : '#E53935';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.collapsed ? '+' : '−', cx, cy);
    ctx.textAlign = 'start';
  }

  // 保存 hit 区域
  node._hitRect = { x, y, w: size.w, h: size.h };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// 坐标转换：屏幕坐标 → 世界坐标
function screenToWorld(screenX, screenY, state) {
  return {
    x: (screenX - state.panX) / state.zoom,
    y: (screenY - state.panY) / state.zoom,
  };
}

// 命中测试：找到鼠标下的节点
function hitTest(worldX, worldY, node) {
  // 检查当前节点
  if (node._hitRect) {
    const r = node._hitRect;
    if (worldX >= r.x && worldX <= r.x + r.w && worldY >= r.y && worldY <= r.y + r.h) {
      // 检查是否点击了折叠按钮
      if (node.children && node.children.length > 0) {
        const cbx = r.x + r.w + 6;
        const cby = r.y + r.h / 2;
        const dx = worldX - cbx;
        const dy = worldY - cby;
        if (Math.sqrt(dx * dx + dy * dy) <= 6) {
          return { node, hitCollapse: true };
        }
      }
      return { node, hitCollapse: false };
    }
  }
  // 递归检查子节点
  if (node.children && !node.collapsed) {
    for (const child of node.children) {
      const result = hitTest(worldX, worldY, child);
      if (result) return result;
    }
  }
  return null;
}

// 计算边界框
function getBounds(node) {
  let minX = node._x, minY = node._y;
  let maxX = node._x + node._size.w, maxY = node._y + node._size.h;

  if (node.children && !node.collapsed) {
    for (const child of node.children) {
      const b = getBounds(child);
      minX = Math.min(minX, b.minX);
      minY = Math.min(minY, b.minY);
      maxX = Math.max(maxX, b.maxX);
      maxY = Math.max(maxY, b.maxY);
    }
  }
  return { minX, minY, maxX, maxY };
}
