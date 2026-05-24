# Mindmap Blog — 部署测试报告

> 日期: 2026-05-25T03:26:43+08:00 | 端口: 8004 | 服务: Python http.server

---

## 测试概要

| 指标 | 数值 |
|------|------|
| 测试用例总数 | 15 |
| 通过 | 15 ✅ |
| 失败 | 0 |
| 通过率 | 100.0% |

---

## 测试详情

| 用例ID | 测试项 | 结果 | 耗时 |
|--------|--------|:--:|------|
| DEP-01 | 服务端口可达 | ✅ PASS | 6ms |
| DEP-02 | index.html Content-Type | ✅ PASS | 8ms |
| DEP-03 | index.html 包含标题 | ✅ PASS | 6ms |
| DEP-04 | app.js 可加载 | ✅ PASS | 7ms |
| DEP-05 | data.js 可加载 | ✅ PASS | 6ms |
| DEP-06 | canvas.js 可加载 | ✅ PASS | 6ms |
| DEP-07 | tree-layout.js 可加载 | ✅ PASS | 7ms |
| DEP-08 | drill-down.js 可加载 | ✅ PASS | 7ms |
| DEP-09 | export.js 可加载 | ✅ PASS | 7ms |
| DEP-10 | node-panel.js 可加载 | ✅ PASS | 7ms |
| DEP-11 | keyboard.js 可加载 | ✅ PASS | 7ms |
| DEP-12 | 8个JS文件HTTP状态均为200 | ✅ PASS | 43ms |
| DEP-13 | 不存在的路径返回404 | ✅ PASS | 7ms |
| DEP-14 | 响应时间 < 100ms | ✅ PASS | 6ms |
| DEP-15 | index.html 大于 2KB | ✅ PASS | 7ms |

---

## 服务信息

- **端口**: 8004
- **地址**: http://localhost:8004/src/index.html
- **部署版本**: v1.0.0-20260525-032615
- **Git Commit**: 1928727
- **PID**: 298619

---

## 结论

✅ **全部测试通过！** 服务部署成功，所有资源可正常访问。

---

📋 测试脚本: `zsx-build-deploy/test-deploy.sh`
