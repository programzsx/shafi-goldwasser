// tree-layout.js — 从左到右逻辑图布局算法

const LAYOUT = {
  nodePaddingX: 14,   // 节点内水平内边距
  nodePaddingY: 8,    // 节点内垂直内边距
  nodeMinWidth: 60,   // 节点最小宽度
  nodeMaxWidth: 240,  // 节点最大宽度
  hGap: 48,           // 父子节点水平间距
  vGap: 8,            // 兄弟节点垂直间距
  fontSize: 13,       // 默认字体大小
  rootFontSize: 15,   // 根节点字体大小
  borderRadius: 8,    // 节点圆角
  rootBorderRadius: 16,
};

// 文字宽度缓存: key = "text|fontSize" -> width
let _textWidthCache = {};
let _textCacheHits = 0;
let _textCacheMisses = 0;

function _cacheKey(text, fontSize) {
  return text + '|' + fontSize;
}

// Canvas 临时测量文字宽度（优化版：无 save/restore，带缓存）
function measureText(ctx, text, fontSize) {
  fontSize = fontSize || LAYOUT.fontSize;
  const key = _cacheKey(text, fontSize);
  if (_textWidthCache[key] !== undefined) {
    _textCacheHits++;
    return _textWidthCache[key];
  }
  _textCacheMisses++;
  // 直接设置 font，不 save/restore —— layout 阶段 ctx 状态无关紧要
  ctx.font = `600 ${fontSize}px -apple-system, "Segoe UI", "PingFang SC", sans-serif`;
  const w = ctx.measureText(text).width;
  _textWidthCache[key] = w;
  return w;
}

// 清除文字宽度缓存（节点标签变化时调用）
function clearTextCache() {
  _textWidthCache = {};
  _textCacheHits = 0;
  _textCacheMisses = 0;
}

// 计算单个节点的尺寸
function calcNodeSize(ctx, node) {
  const isRoot = node.id === 'root' || (!node.parent && node.depth === 0);
  const fontSize = isRoot ? LAYOUT.rootFontSize : LAYOUT.fontSize;
  const textWidth = measureText(ctx, node.label, fontSize);
  const hasContent = node.content && node.content.length > 0;
  const extraW = hasContent ? 12 : 0; // 给标记留空间
  const w = Math.min(Math.max(textWidth + LAYOUT.nodePaddingX * 2 + extraW, LAYOUT.nodeMinWidth), LAYOUT.nodeMaxWidth);
  const h = fontSize + LAYOUT.nodePaddingY * 2;
  return { w, h, fontSize, isRoot, hasContent };
}

// 递归布局：返回每个节点及其子树的总高度
function layoutTree(node, ctx, depth = 0) {
  const size = calcNodeSize(ctx, node);
  node._size = size;
  node._depth = depth;

  if (!node.children || node.children.length === 0 || node.collapsed) {
    node._totalHeight = size.h;
    node._childrenHeight = 0;
    return node._totalHeight;
  }

  let totalChildrenHeight = 0;
  const childHeights = [];
  for (const child of node.children) {
    const h = layoutTree(child, ctx, depth + 1);
    childHeights.push(h);
    totalChildrenHeight += h;
  }
  // 加上兄弟节点之间的间距
  totalChildrenHeight += LAYOUT.vGap * (node.children.length - 1);

  node._totalHeight = Math.max(size.h, totalChildrenHeight);
  node._childrenHeight = totalChildrenHeight;
  node._childHeights = childHeights;
  return node._totalHeight;
}

// 分配坐标（从根开始递归）
function assignPositions(node, x = 0, y = 0) {
  const size = node._size;
  // 节点中心 Y 对齐到子树总高度的中心
  const selfCenterY = y + node._totalHeight / 2;
  node._x = x;
  node._y = selfCenterY - size.h / 2;
  node._cx = x + size.w / 2;
  node._cy = selfCenterY;

  if (!node.children || node.children.length === 0 || node.collapsed) return;

  const childX = x + size.w + LAYOUT.hGap;
  let childY = y + (node._totalHeight - node._childrenHeight) / 2;

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    assignPositions(child, childX, childY);
    childY += node._childHeights[i] + LAYOUT.vGap;
  }
}

// 主入口：布局整棵树
function doLayout(root, ctx) {
  layoutTree(root, ctx);
  assignPositions(root, 0, 0);
  return root;
}
