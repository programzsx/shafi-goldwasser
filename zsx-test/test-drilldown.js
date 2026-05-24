// zsx-test/test-drilldown.js — drill-down.js 模块测试
(function(T) {

// 需要在全局设置 _drillStack 让 drill-down.js 使用
// drill-down.js 使用全局 drillStack 变量

T.suite('drill-down.js — 下钻状态');

T.test('DRL-01 drillDown 下钻到子节点', function() {
  drillStack = [];
  const result = drillDown(DEFAULT_MINDMAP.root, 'c1');
  T.assertTrue(result, '下钻应成功');
  T.assertEqual(drillStack.length, 1, 'stack长度=1');
  T.assertEqual(drillStack[0].nodeId, 'c1', 'stack[0].nodeId 为 c1');
  T.assertEqual(drillStack[0].label, '语言', 'stack[0].label 为 语言');

  const displayRoot = getDisplayRoot(DEFAULT_MINDMAP.root);
  T.assertEqual(displayRoot.id, 'c1', 'displayRoot 应为 c1');

  drillStack = [];
});

T.test('DRL-02 drillUp 返回上级', function() {
  drillStack = [];
  drillDown(DEFAULT_MINDMAP.root, 'c1');
  drillDown(DEFAULT_MINDMAP.root, 'c1-1');

  const result = drillUp();
  T.assertTrue(result, '上钻应成功');
  T.assertEqual(drillStack.length, 1, 'stack长度-1');
  T.assertEqual(drillStack[0].nodeId, 'c1', '当前在 c1');

  drillStack = [];
});

T.test('DRL-03 drillUp 栈空无操作', function() {
  drillStack = [];
  const result = drillUp();
  T.assertFalse(result, '空栈上钻应返回false');
  T.assertEqual(drillStack.length, 0, 'stack仍为空');

  const displayRoot = getDisplayRoot(DEFAULT_MINDMAP.root);
  T.assertEqual(displayRoot.id, 'root', 'displayRoot 仍为根');

  drillStack = [];
});

T.test('DRL-04 drillTo(-1) 回到根', function() {
  drillStack = [];
  drillDown(DEFAULT_MINDMAP.root, 'c1');
  drillDown(DEFAULT_MINDMAP.root, 'c1-1');

  drillTo(-1);
  T.assertEqual(drillStack.length, 0, 'stack 清空');
  T.assertEqual(getDisplayRoot(DEFAULT_MINDMAP.root).id, 'root', '回到根');

  drillStack = [];
});

T.test('DRL-05 drillTo(0) 截断到第一层', function() {
  drillStack = []; // 手动设置
  drillDown(DEFAULT_MINDMAP.root, 'c1');
  drillDown(DEFAULT_MINDMAP.root, 'c1-1');
  drillDown(DEFAULT_MINDMAP.root, 'c1-1-1');
  T.assertEqual(drillStack.length, 3, '初始3层');

  drillTo(1); // 截断到第2层
  T.assertEqual(drillStack.length, 2, '截断后2层');
  T.assertEqual(drillStack[1].nodeId, 'c1-1', '停留在 c1-1');

  drillStack = [];
});

T.test('DRL-06 getDisplayRoot 默认返回根', function() {
  drillStack = [];
  const root = getDisplayRoot(DEFAULT_MINDMAP.root);
  T.assertEqual(root.id, 'root', '空栈时返回根');
});

T.test('DRL-07 多层下钻后 getDisplayRoot 正确', function() {
  drillStack = [];
  drillDown(DEFAULT_MINDMAP.root, 'c1');
  drillDown(DEFAULT_MINDMAP.root, 'c1-1');
  drillDown(DEFAULT_MINDMAP.root, 'c1-1-1');

  const display = getDisplayRoot(DEFAULT_MINDMAP.root);
  T.assertEqual(display.id, 'c1-1-1', '第3层下钻 displayRoot 正确');
  T.assertEqual(display.label, '基本语法', 'label 正确');

  drillStack = [];
});

T.test('DRL-08 下钻到叶子节点', function() {
  drillStack = [];
  drillDown(DEFAULT_MINDMAP.root, 'c3-3'); // Flutter — 无子节点
  const display = getDisplayRoot(DEFAULT_MINDMAP.root);
  T.assertEqual(display.id, 'c3-3', '叶子节点下钻');
  T.assertEqual(display.children.length, 0, '叶子节点无子节点');

  drillStack = [];
});

})(TestRunner);
