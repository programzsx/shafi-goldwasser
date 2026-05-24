// zsx-test/test-framework.js — 轻量级测试框架
window.TestRunner = (function() {
  const results = [];
  let currentSuite = '';
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (!condition) throw new Error('ASSERT FAILED: ' + message);
  }

  function assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`ASSERT FAILED: ${message}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
    }
  }

  function assertDeepEqual(actual, expected, message) {
    const a = JSON.stringify(actual);
    const b = JSON.stringify(expected);
    if (a !== b) {
      throw new Error(`ASSERT FAILED: ${message}\n  expected: ${b}\n  actual:   ${a}`);
    }
  }

  function assertNotNull(actual, message) {
    if (actual === null || actual === undefined) {
      throw new Error('ASSERT FAILED: ' + message + ' (was null/undefined)');
    }
  }

  function assertTrue(actual, message) {
    if (!actual) throw new Error('ASSERT FAILED: ' + message);
  }

  function assertFalse(actual, message) {
    if (actual) throw new Error('ASSERT FAILED: ' + message);
  }

  function suite(name) {
    currentSuite = name;
  }

  function test(name, fn) {
    const start = performance.now();
    try {
      fn();
      const duration = (performance.now() - start).toFixed(1);
      results.push({ suite: currentSuite, name, status: 'PASS', duration: duration + 'ms' });
      passed++;
    } catch (e) {
      const duration = (performance.now() - start).toFixed(1);
      results.push({ suite: currentSuite, name, status: 'FAIL', duration: duration + 'ms', error: e.message });
      failed++;
    }
  }

  function summary() {
    const total = passed + failed;
    return {
      total, passed, failed,
      passRate: total > 0 ? (passed / total * 100).toFixed(1) + '%' : '0%',
      results
    };
  }

  function renderReport(containerId) {
    const s = summary();
    const el = document.getElementById(containerId);
    if (!el) return;

    let html = `<div style="font-family:monospace;font-size:13px;padding:16px">`;
    html += `<h2 style="color:#333;margin:0 0 4px">测试报告</h2>`;
    html += `<p style="color:#888;margin:0 0 16px">${new Date().toISOString()} | 共 ${s.total} 项 | <span style="color:#4CAF50">通过 ${s.passed}</span> | <span style="color:#E53935">失败 ${s.failed}</span> | 通过率 ${s.passRate}</p>`;
    html += `<hr style="border:none;border-top:1px solid #e0e0e0">`;

    let lastSuite = '';
    s.results.forEach(r => {
      if (r.suite !== lastSuite) {
        html += `<h3 style="color:#1976D2;margin:16px 0 8px">📦 ${r.suite}</h3>`;
        lastSuite = r.suite;
      }
      const icon = r.status === 'PASS' ? '✅' : '❌';
      const color = r.status === 'PASS' ? '#4CAF50' : '#E53935';
      html += `<div style="margin:4px 0;padding:4px 8px;border-radius:4px;background:${r.status==='FAIL'?'#FFF0F0':'#fff'}">`;
      html += `<span>${icon}</span> <span style="color:${color}">${r.name}</span>`;
      html += `<span style="color:#999;margin-left:8px;font-size:11px">${r.duration}</span>`;
      if (r.error) {
        html += `<pre style="color:#C62828;font-size:11px;margin:4px 0 0 20px;white-space:pre-wrap">${r.error}</pre>`;
      }
      html += `</div>`;
    });

    html += `<hr style="border:none;border-top:1px solid #e0e0e0">`;
    html += `<p style="font-size:14px;font-weight:600;color:${s.failed===0?'#4CAF50':'#E53935'}">${s.failed===0?'🎉 全部通过！':'⚠️ 存在失败用例'}</p>`;
    html += `</div>`;
    el.innerHTML = html;
  }

  return { assert, assertEqual, assertDeepEqual, assertNotNull, assertTrue, assertFalse, suite, test, summary, renderReport };
})();
