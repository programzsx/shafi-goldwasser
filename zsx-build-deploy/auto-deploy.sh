#!/bin/bash
# auto-deploy.sh — 一键打包+上传+部署到阿里云 ECS 8004 端口
# 用法: bash zsx-build-deploy/auto-deploy.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ECS_HOST="8.160.174.178"
ECS_BASE="/home/shafi-goldwasser"
PORT=8004

echo ""
echo "╔═════════════════════════════════════════╗"
echo "║  Shafi Goldwasser — ECS 自动部署      ║"
echo "║  端口: $PORT                          ║"
echo "╚═════════════════════════════════════════╝"
echo ""

# === Step 1: 打包 ===
echo "📦 Step 1/4: 打包..."
cd "$PROJECT_DIR"
bash "$SCRIPT_DIR/package.sh"
VERSION=$(cat "$SCRIPT_DIR/VERSION")
TARBALL="$SCRIPT_DIR/dist/${VERSION}.tar.gz"
echo "   版本: $VERSION"

# === Step 2: 上传 ===
echo ""
echo "📤 Step 2/4: 上传到 ECS..."
scp "$TARBALL" "root@${ECS_HOST}:${ECS_BASE}-deploy.tar.gz"
echo "   ✅ 已上传"

# === Step 3: 部署 ===
echo ""
echo "🚀 Step 3/4: ECS 部署..."
ssh "root@${ECS_HOST}" << ECS_SCRIPT
set -e
mkdir -p ${ECS_BASE}/dist ${ECS_BASE}/logs

# 解压
cd ${ECS_BASE}/dist
tar -xzf ${ECS_BASE}-deploy.tar.gz

# 更新 current 符号链接
rm -f current
ln -sf ${ECS_BASE}/dist/${VERSION} current

# 更新 systemd ExecStart 中的 WorkingDirectory（已指向 current，自动生效）
echo "   current -> ${VERSION}"
ECS_SCRIPT
echo "   ✅ 文件已部署"

# === Step 4: 重启服务 ===
echo ""
echo "🔄 Step 4/4: 重启服务..."
ssh "root@${ECS_HOST}" "systemctl restart shafi-goldwasser && sleep 1 && systemctl is-active shafi-goldwasser"
echo "   ✅ 服务已重启"

# === 验证 ===
echo ""
echo "🔍 公网验证..."
sleep 0.5
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://${ECS_HOST}:${PORT}/src/index.html")
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ HTTP $HTTP_CODE — 服务正常"
else
    echo "   ❌ HTTP $HTTP_CODE — 部署异常!"
    exit 1
fi

echo ""
echo "╔═════════════════════════════════════════╗"
echo "║  ✅ 部署完成                          ║"
echo "║  版本: $VERSION                      ║"
echo "║  地址: http://${ECS_HOST}:${PORT}/src/index.html ║"
echo "╚═════════════════════════════════════════╝"
