#!/bin/bash
# deploy.sh — 部署脚本
# 用法: bash zsx-build-deploy/deploy.sh [version]
#   version: 可选，指定版本号。不指定则使用最新版本。

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"
PID_FILE="$SCRIPT_DIR/deploy.pid"
LOG_FILE="$SCRIPT_DIR/logs/server.log"
PORT=8004

echo "========================================="
echo "  Mindmap Blog — 部署到端口 $PORT"
echo "========================================="

# 确定版本
if [ -n "$1" ]; then
  VERSION="$1"
else
  VERSION=$(cat "$SCRIPT_DIR/../VERSION" 2>/dev/null || echo "")
  if [ -z "$VERSION" ]; then
    # 自动找最新版本
    VERSION=$(ls -dt "$DIST_DIR"/v*/ 2>/dev/null | head -1 | xargs basename)
  fi
fi

if [ -z "$VERSION" ]; then
  echo "❌ 错误: 未找到可部署的版本。请先运行 package.sh"
  exit 1
fi

VERSION_DIR="$DIST_DIR/$VERSION"
VERSION_SRC="$VERSION_DIR/src"

if [ ! -d "$VERSION_SRC" ]; then
  echo "❌ 错误: 版本目录不存在: $VERSION_SRC"
  echo "   请先运行: bash zsx-build-deploy/package.sh"
  exit 1
fi

echo "📦 部署版本: $VERSION"
echo "📂 源目录: $VERSION_SRC"

# 停止旧服务
echo ""
echo "🛑 停止旧服务..."
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "  终止进程 PID=$OLD_PID"
    kill "$OLD_PID" 2>/dev/null || true
    sleep 1
    # 强制终止
    kill -9 "$OLD_PID" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
fi

# 确保端口释放
if lsof -i :$PORT 2>/dev/null | grep -q LISTEN; then
  echo "  ⚠️ 端口 $PORT 仍被占用，强制释放..."
  fuser -k ${PORT}/tcp 2>/dev/null || true
  sleep 1
fi

# 更新 current 符号链接
rm -f "$DIST_DIR/current"
ln -sf "$VERSION_DIR" "$DIST_DIR/current"
echo "🔗 current -> $VERSION"

# 创建日志目录
mkdir -p "$SCRIPT_DIR/logs"

# 启动服务
echo ""
echo "🚀 启动 HTTP 服务 (端口 $PORT)..."
cd "$VERSION_DIR"

# 使用 Python http.server
python3 -m http.server $PORT --bind 0.0.0.0 > "$LOG_FILE" 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > "$PID_FILE"

sleep 1

# 验证服务存活
if kill -0 "$SERVER_PID" 2>/dev/null; then
  echo "✅ 服务已启动"
  echo "   PID: $SERVER_PID"
  echo "   端口: $PORT"
  echo "   日志: $LOG_FILE"
  echo "   访问: http://localhost:$PORT/src/index.html"
else
  echo "❌ 服务启动失败！"
  echo "   查看日志: cat $LOG_FILE"
  exit 1
fi

# 快速 HTTP 检查
echo ""
echo "🔍 HTTP 可达性检查..."
sleep 0.5
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/src/index.html" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ HTTP $HTTP_CODE — 服务可达"
else
  echo "⚠️  HTTP $HTTP_CODE — 请检查日志: cat $LOG_FILE"
fi

echo ""
echo "========================================="
echo "  部署完成 ✅"
echo "  版本: $VERSION"
echo "  地址: http://localhost:$PORT/src/index.html"
echo "========================================="
