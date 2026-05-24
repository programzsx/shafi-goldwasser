# Mindmap Blog — 自动部署方案

> 版本：1.0 | 日期：2026-05-25

---

## 一、部署架构

```
开发者 push 代码
  └─ 手动触发部署脚本
      ├── Step 1: 版本打包（package.sh）
      │   ├── 生成版本号 v1.0.0-YYYYMMDD-HHMMSS
      │   ├── 复制 src/* 到 dist/v1.0.0-YYYYMMDD-HHMMSS/
      │   ├── 压缩为 tar.gz
      │   └── 记录版本到 VERSION 文件
      │
      ├── Step 2: 部署（deploy.sh）
      │   ├── 停止旧服务（端口 8004）
      │   ├── 解压最新版本包
      │   ├── 启动 Python HTTP Server（8004）
      │   └── 验证服务存活
      │
      └── Step 3: 部署测试（test-deploy.sh）
          ├── HTTP 状态码检查
          ├── 静态资源可达性
          ├── 页面内容完整性
          └── 生成测试报告
```

## 二、版本号规范

```
格式: v{major}.{minor}.{patch}-{YYYYMMDD}-{HHMMSS}
示例: v1.0.0-20260525-032500

major: 主版本（大功能变更）
minor: 次版本（功能增加）
patch: 补丁版本（Bug修复）
```

## 三、部署目标

| 项目 | 值 |
|------|-----|
| 服务器 | 本地 WSL / ECS |
| 端口 | **8004** |
| 协议 | HTTP |
| Web 根目录 | `zsx-build-deploy/dist/current/` |
| 访问地址 | `http://localhost:8004/src/index.html` |
| 进程管理 | 后台进程 + PID 文件 |

## 四、部署目录结构

```
zsx-build-deploy/
├── package.sh            # 版本打包脚本
├── deploy.sh             # 部署脚本
├── test-deploy.sh        # 部署测试脚本
├── VERSION               # 当前部署版本号
├── deploy.pid            # 服务进程 PID
├── dist/
│   ├── current/          # 当前运行版本（符号链接）
│   ├── v1.0.0-20260525-032500/   # 历史版本目录
│   │   └── src/
│   │       ├── index.html
│   │       ├── app.js
│   │       └── ...
│   └── v1.0.0-20260525-032500.tar.gz  # 压缩包
├── deploy-test-report.md # 部署测试报告
└── logs/
    └── server.log        # 服务日志
```

## 五、部署测试项

| 测试ID | 测试项 | 方法 | 期望 |
|--------|--------|------|------|
| DEP-01 | 服务端口可达 | curl 8004 | HTTP 200 |
| DEP-02 | index.html 返回 HTML | curl index.html | Content-Type: text/html |
| DEP-03 | app.js 可加载 | curl app.js | HTTP 200, 含 function |
| DEP-04 | data.js 可加载 | curl data.js | HTTP 200, 含 DEFAULT_MINDMAP |
| DEP-05 | canvas.js 可加载 | curl canvas.js | HTTP 200 |
| DEP-06 | 导出模块可加载 | curl export.js | HTTP 200 |
| DEP-07 | 页面标题包含 Mindmap | grep title | 含 "Mindmap Blog" |
| DEP-08 | 所有 8 个 JS 文件可达 | 批量 curl | 全部 200 |
| DEP-09 | 无 404 返回 | curl 不存在路径 | HTTP 404（非 500） |
| DEP-10 | 响应时间 < 50ms | curl -w | time_total < 0.05 |

## 六、回滚策略

```
如果部署测试失败:
  1. 停止当前服务
  2. 将 dist/current/ 符号链接指向上一个版本
  3. 重新启动服务
  4. 再次运行部署测试
```

## 七、注意事项

- 本项目为纯前端应用，无后端 API，部署即启动静态文件服务器
- Python http.server 仅用于开发/演示，生产环境建议使用 Nginx
- 每次部署保留历史版本包，便于回滚
- PID 文件用于防止重复启动和优雅关闭
