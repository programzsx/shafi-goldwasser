// zsx-test/test-data.js — data.js 模块测试
(function(T) {

T.suite('data.js — 节点查找');

T.test('DATA-01 findNode 查找存在的节点', function() {
  const node = findNode(DEFAULT_MINDMAP.root, 'c1-1-1');
  T.assertNotNull(node, '节点应存在');
  T.assertEqual(node.label, '基本语法', 'label 应为 基本语法');
});

T.test('DATA-02 findNode 查找不存在的节点', function() {
  const node = findNode(DEFAULT_MINDMAP.root, 'nonexistent-id');
  T.assertEqual(node, null, '应返回 null');
});

T.test('DATA-03 findParent 查找父节点', function() {
  const result = findParent(DEFAULT_MINDMAP.root, 'c1-1');
  T.assertNotNull(result, '父节点应存在');
  T.assertEqual(result.parent.id, 'c1', '父节点 id 应为 c1');
  T.assertTrue(typeof result.index === 'number', '应返回索引');
});

T.test('DATA-04 findParent 根节点无父', function() {
  const result = findParent(DEFAULT_MINDMAP.root, 'root');
  T.assertEqual(result, null, '根节点应返回 null');
});

T.test('DATA-05 getNodePath 完整路径', function() {
  const path = getNodePath(DEFAULT_MINDMAP.root, 'c1-1-1');
  T.assertNotNull(path, '路径应存在');
  T.assertEqual(path.length, 4, '路径应有4层');
  T.assertEqual(path[0].id, 'root', '第一层是根');
  T.assertEqual(path[3].id, 'c1-1-1', '最后一层是目标');
});

// ────────────────────
T.suite('data.js — 节点 CRUD');

T.test('DATA-06 createChildNode 创建子节点', function() {
  const root = cloneTree(DEFAULT_MINDMAP.root);
  const before = root.children[0].children.length;
  const newNode = createChildNode(root, 'c1', '测试子节点');
  T.assertNotNull(newNode, '应返回新节点');
  T.assertEqual(newNode.label, '测试子节点', 'label 正确');
  T.assertEqual(root.children[0].children.length, before + 1, '子节点数+1');
  T.assertEqual(newNode.content, '', 'content 默认为空');
  T.assertEqual(newNode.children.length, 0, 'children 默认为空数组');
  T.assertFalse(newNode.collapsed, '默认不折叠');
});

T.test('DATA-07 createChildNode 不存在的父节点', function() {
  const root = cloneTree(DEFAULT_MINDMAP.root);
  const result = createChildNode(root, 'bad-id');
  T.assertEqual(result, null, '应返回 null');
});

T.test('DATA-08 createSiblingNode 创建兄弟节点', function() {
  const root = cloneTree(DEFAULT_MINDMAP.root);
  const before = root.children.length;
  const newNode = createSiblingNode(root, 'c2', '新兄弟');
  T.assertNotNull(newNode, '应返回新节点');
  T.assertEqual(root.children.length, before + 1, '兄弟数+1');
  // 应该在 c2 后面
  const idx = root.children.findIndex(c => c.id === newNode.id);
  T.assertEqual(idx, 2, '新节点应在 c2 之后(c3之前)');
});

T.test('DATA-09 createSiblingNode 根节点禁止', function() {
  const root = cloneTree(DEFAULT_MINDMAP.root);
  const result = createSiblingNode(root, 'root');
  T.assertEqual(result, null, '根节点不能创建兄弟');
});

T.test('DATA-10 deleteNode 删除节点', function() {
  const root = cloneTree(DEFAULT_MINDMAP.root);
  const before = root.children.length;
  const deleted = deleteNode(root, 'c2');
  T.assertNotNull(deleted, '应返回被删除节点');
  T.assertEqual(deleted.id, 'c2', '删除的是 c2');
  T.assertEqual(root.children.length, before - 1, 'children 数-1');
  // 验证 c2 真的不在 children 中
  const found = root.children.find(c => c.id === 'c2');
  T.assertEqual(found, undefined, 'c2 不应在 children 中');
});

T.test('DATA-11 deleteNode 根禁止删除', function() {
  const root = cloneTree(DEFAULT_MINDMAP.root);
  const result = deleteNode(root, 'root');
  T.assertEqual(result, null, '根节点不能删除');
});

T.test('DATA-12 updateNode 更新label', function() {
  const root = cloneTree(DEFAULT_MINDMAP.root);
  const ok = updateNode(root, 'c1', { label: '新名称' });
  T.assertTrue(ok, '更新应成功');
  const node = findNode(root, 'c1');
  T.assertEqual(node.label, '新名称', 'label 已更新');
});

T.test('DATA-13 updateNode 更新content', function() {
  const root = cloneTree(DEFAULT_MINDMAP.root);
  updateNode(root, 'c1', { content: '新正文' });
  const node = findNode(root, 'c1');
  T.assertEqual(node.content, '新正文', 'content 已更新');
});

T.test('DATA-14 toggleCollapse 切换折叠', function() {
  const root = cloneTree(DEFAULT_MINDMAP.root);
  const before = findNode(root, 'c1').collapsed;
  toggleCollapse(root, 'c1');
  const after = findNode(root, 'c1').collapsed;
  T.assertTrue(before !== after, '折叠状态应切换');
  toggleCollapse(root, 'c1');
  T.assertEqual(findNode(root, 'c1').collapsed, before, '再次切换应恢复');
});

T.test('DATA-15 countNodes 统计节点数', function() {
  const count = countNodes(DEFAULT_MINDMAP.root);
  T.assertEqual(count, 18, '默认数据应有18个节点');
});

// ────────────────────
T.suite('data.js — 撤销/重做');

T.test('DATA-16 saveHistory + undo', function() {
  const root = cloneTree(DEFAULT_MINDMAP.root);
  saveHistory(root);
  const original = JSON.stringify(root);

  updateNode(root, 'c1', { label: '修改后' });
  saveHistory(root);
  T.assertTrue(root.children[0].label !== DEFAULT_MINDMAP.root.children[0].label, '确认已修改');

  const restored = undo(root);
  T.assertNotNull(restored, 'undo 应返回恢复数据');
  const restoredRoot = JSON.parse(JSON.stringify(DEFAULT_MINDMAP.root));
  T.assertEqual(restored.children[0].label, restoredRoot.children[0].label, '应恢复到原始值');
});

T.test('DATA-17 redo 恢复', function() {
  // 先设置历史
  const root = cloneTree(DEFAULT_MINDMAP.root);
  saveHistory(root);
  updateNode(root, 'c1', { label: '修改后' });
  saveHistory(root);
  undo(root);
  const redone = redo(root);
  T.assertNotNull(redone, 'redo 应返回数据');
  T.assertEqual(redone.children[0].label, '修改后', 'redo 后应为修改后的值');
});

// ────────────────────
T.suite('data.js — 工具函数');

T.test('DATA-18 generateId 唯一性', function() {
  const ids = new Set();
  for (let i = 0; i < 100; i++) {
    const id = generateId();
    T.assertFalse(ids.has(id), 'ID 不应重复: ' + id);
    ids.add(id);
  }
  T.assertEqual(ids.size, 100, '应生成100个唯一ID');
});

T.test('DATA-19 cloneTree 深拷贝', function() {
  const root = cloneTree(DEFAULT_MINDMAP.root);
  T.assertDeepEqual(root, DEFAULT_MINDMAP.root, 'clone 应与原始数据一致');
  root.children[0].label = 'MODIFIED';
  T.assertTrue(root.children[0].label !== DEFAULT_MINDMAP.root.children[0].label, 'clone 修改不影响原始');
});

})(TestRunner);
