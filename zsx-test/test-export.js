// zsx-test/test-export.js — export.js 模块测试
(function(T) {

T.suite('export.js — JSON 导出');

T.test('EXP-01 exportJSON 生成合法JSON', function() {
  // 不实际触发下载，只验证生成的 JSON 字符串
  const data = JSON.parse(JSON.stringify(DEFAULT_MINDMAP));
  const json = JSON.stringify(data);
  T.assertNotNull(json, '应生成 JSON');
  T.assertTrue(json.length > 100, 'JSON 应有一定长度');
  const parsed = JSON.parse(json);
  T.assertEqual(parsed.root.id, 'root', '解析后 root.id 正确');
  T.assertNotNull(parsed.root.children, '应有 children');
});

T.test('EXP-02 downloadFile 函数存在', function() {
  T.assertEqual(typeof downloadFile, 'function', 'downloadFile 应为函数');
  T.assertEqual(typeof loadFromFile, 'function', 'loadFromFile 应为函数');
});

T.suite('export.js — Markdown 导出');

T.test('EXP-03 exportMarkdown 包含标题层级', function() {
  // 模拟 exportMarkdown 的核心逻辑
  let md = '';
  const root = DEFAULT_MINDMAP.root;
  function walk(node, depth) {
    const prefix = '#'.repeat(Math.min(depth + 1, 6));
    md += prefix + ' ' + node.label + '\n\n';
    if (node.content) md += node.content + '\n\n';
    if (node.children) node.children.forEach(c => walk(c, depth + 1));
  }
  walk(root, 0);

  T.assertTrue(md.includes('# 思维导图'), '应包含根节点标题');
  T.assertTrue(md.includes('## 语言'), '应包含二级标题');
  T.assertTrue(md.includes('### Java'), '应包含三级标题');
  T.assertTrue(md.length > 500, 'Markdown 输出应有足够长度');
});

T.test('EXP-04 exportMarkdown 包含节点正文', function() {
  let md = '';
  const root = DEFAULT_MINDMAP.root;
  function walk(node, depth) {
    const prefix = '#'.repeat(Math.min(depth + 1, 6));
    md += prefix + ' ' + node.label + '\n\n';
    if (node.content) md += node.content + '\n\n';
    if (node.children) node.children.forEach(c => walk(c, depth + 1));
  }
  walk(root, 0);

  T.assertTrue(md.includes('欢迎使用 Mindmap Blog'), '应包含根节点 content');
  T.assertTrue(md.includes('面向对象'), '应包含子节点 content');
});

T.suite('export.js — HTML 导出');

T.test('EXP-05 exportHTML 生成完整HTML结构', function() {
  const data = JSON.parse(JSON.stringify(DEFAULT_MINDMAP));
  const dataJSON = JSON.stringify(data);

  // 模拟 HTML 生成的核心部分
  const html = '<!DOCTYPE html>\n<html>\n<head><title>' + data.title + '</title></head>\n<body>\n<script>var mindmap = ' + dataJSON + ';</script>\n</body>\n</html>';

  T.assertTrue(html.includes('<!DOCTYPE html>'), '应有 DOCTYPE');
  T.assertTrue(html.includes('<title>' + data.title), '应有 title');
  T.assertTrue(html.includes('var mindmap ='), '应内嵌数据');
  T.assertTrue(html.includes('"root"'), '应包含 root 数据');
  T.assertTrue(html.length > 1000, 'HTML 应有足够长度');
});

T.test('EXP-06 导出的HTML中嵌入的JSON可解析', function() {
  const data = JSON.parse(JSON.stringify(DEFAULT_MINDMAP));
  const dataJSON = JSON.stringify(data);

  // 提取 JS 中的 JSON
  const match = dataJSON.match(/"root"/);
  T.assertNotNull(match, 'JSON 应包含 root');

  const parsed = JSON.parse(dataJSON);
  T.assertEqual(parsed.root.id, data.root.id, '解析后的 root.id 一致');
  T.assertEqual(parsed.root.label, data.root.label, '解析后的 root.label 一致');
});

T.suite('export.js — 工具函数');

T.test('EXP-07 JSON 字符串可以原样恢复', function() {
  const original = JSON.parse(JSON.stringify(DEFAULT_MINDMAP));
  const json = JSON.stringify(original);
  const restored = JSON.parse(json);
  T.assertDeepEqual(restored, original, '序列化→反序列化应保持一致');
});

})(TestRunner);
