// zsx-test/test-layout.js — tree-layout.js 模块测试
(function(T) {

// 创建一个简单的测试树
function makeTestTree() {
  return {
    id: 'r', label: '根', content: '', collapsed: false,
    children: [
      { id: 'a', label: '子A', content: '', collapsed: false,
        children: [
          { id: 'a1', label: '孙A1', content: '', collapsed: false, children: [] },
          { id: 'a2', label: '孙A2', content: '有正文', collapsed: false, children: [] }
        ]
      },
      { id: 'b', label: '子B', content: '', collapsed: false, children: [] },
      { id: 'c', label: '折叠C', content: '', collapsed: true,
        children: [
          { id: 'c1', label: '隐藏C1', content: '', collapsed: false, children: [] }
        ]
      }
    ]
  };
}

// 创建 mock Canvas context
function makeMockCtx() {
  return {
    saved: false,
    font: '',
    save: function() { this.saved = true; },
    restore: function() { this.saved = false; },
    measureText: function(text) {
      return { width: text.length * 8 }; // 简化：每个字符8px宽
    }
  };
}

T.suite('tree-layout.js — 基本布局');

T.test('LAY-01 doLayout 根节点有坐标', function() {
  const root = makeTestTree();
  const ctx = makeMockCtx();
  doLayout(root, ctx);
  T.assertTrue(typeof root._x === 'number', '应有 _x');
  T.assertTrue(typeof root._y === 'number', '应有 _y');
  T.assertEqual(root._x, 0, '根_x 应为 0');
});

T.test('LAY-02 doLayout 子节点在父节点右侧', function() {
  const root = makeTestTree();
  const ctx = makeMockCtx();
  doLayout(root, ctx);
  T.assertTrue(root.children[0]._x > root._x, '子节点_x 应大于父节点_x');
  T.assertTrue(root.children[0]._x >= root._size.w + LAYOUT.hGap, '子节点_x ≥ 父宽+间距');
});

T.test('LAY-03 doLayout 兄弟节点y递增', function() {
  const root = makeTestTree();
  const ctx = makeMockCtx();
  doLayout(root, ctx);
  const a = root.children[0];
  const b = root.children[1];
  T.assertTrue(b._y > a._y, '兄弟节点_y 递增');
});

T.test('LAY-04 doLayout 折叠节点不布局子节点', function() {
  const root = makeTestTree();
  const ctx = makeMockCtx();
  doLayout(root, ctx);
  const c = root.children[2];
  T.assertTrue(c.collapsed, 'c 应折叠');
  // 折叠节点的子节点不应有坐标
  T.assertEqual(c.children[0]._x, undefined, '折叠节点的子节点不应有 _x');
});

T.test('LAY-05 calcNodeSize 根节点字体更大', function() {
  const ctx = makeMockCtx();
  const rootNode = { id: 'root', label: '根', content: '', collapsed: false, children: [], parent: null, depth: 0 };
  const size = calcNodeSize(ctx, rootNode);
  T.assertEqual(size.fontSize, LAYOUT.rootFontSize, '根节点字体 ' + LAYOUT.rootFontSize);
});

T.test('LAY-06 calcNodeSize 普通节点字体', function() {
  const ctx = makeMockCtx();
  const normalNode = { id: 'n1', label: '普通', content: '', collapsed: false, children: [], parent: {}, depth: 1 };
  const size = calcNodeSize(ctx, normalNode);
  T.assertEqual(size.fontSize, LAYOUT.fontSize, '普通节点字体 ' + LAYOUT.fontSize);
});

T.test('LAY-07 calcNodeSize 有内容节点标记hasContent', function() {
  const ctx = makeMockCtx();
  const nodeWithContent = { id: 'n1', label: '有内容', content: '正文', collapsed: false, children: [], parent: {}, depth: 1 };
  const size = calcNodeSize(ctx, nodeWithContent);
  T.assertTrue(size.hasContent, '有content应标记hasContent');
});

T.test('LAY-08 节点尺寸在合理范围内', function() {
  const ctx = makeMockCtx();
  const shortNode = { id: 'n1', label: '短', content: '', collapsed: false, children: [], parent: {}, depth: 1 };
  const shortSize = calcNodeSize(ctx, shortNode);
  T.assertTrue(shortSize.w >= LAYOUT.nodeMinWidth, '短文字宽度≥最小宽度');

  const longLabel = '这是一个非常非常非常非常非常长的节点标题文字';
  const longNode = { id: 'n1', label: longLabel, content: '', collapsed: false, children: [], parent: {}, depth: 1 };
  const longSize = calcNodeSize(ctx, longNode);
  T.assertTrue(longSize.w <= LAYOUT.nodeMaxWidth, '长文字宽度≤最大宽度');
});

T.test('LAY-09 布局后所有非折叠节点都有坐标', function() {
  const root = makeTestTree();
  const ctx = makeMockCtx();
  doLayout(root, ctx);
  function check(node) {
    T.assertTrue(typeof node._x === 'number', node.id + ' 应有 _x');
    T.assertTrue(typeof node._y === 'number', node.id + ' 应有 _y');
    T.assertTrue(typeof node._size === 'object', node.id + ' 应有 _size');
    if (node.children && !node.collapsed) {
      node.children.forEach(check);
    }
  }
  check(root);
});

})(TestRunner);
