#!/bin/bash
# package.sh — 版本打包脚本
# 用法: bash zsx-build-deploy/package.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SRC_DIR="$PROJECT_DIR/src"
DIST_DIR="$SCRIPT_DIR/dist"

# 生成版本号
MAJOR=1
MINOR=0
PATCH=0
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
VERSION="v${MAJOR}.${MINOR}.${PATCH}-${TIMESTAMP}"
VERSION_DIR="$DIST_DIR/$VERSION"
VERSION_SRC="$VERSION_DIR/src"

echo "========================================="
echo "  Mindmap Blog — 版本打包"
echo "  版本: $VERSION"
echo "========================================="

# 检查源文件
if [ ! -f "$SRC_DIR/index.html" ]; then
  echo "❌ 错误: src/index.html 不存在"
  exit 1
fi

# 创建目标目录
mkdir -p "$VERSION_SRC" "$DIST_DIR"

# 复制源代码文件
echo "📦 复制源文件..."
cp "$SRC_DIR/index.html" "$VERSION_SRC/"
cp "$SRC_DIR/app.js" "$VERSION_SRC/"
cp "$SRC_DIR/canvas.js" "$VERSION_SRC/"
cp "$SRC_DIR/data.js" "$VERSION_SRC/"
cp "$SRC_DIR/drill-down.js" "$VERSION_SRC/"
cp "$SRC_DIR/export.js" "$VERSION_SRC/"
cp "$SRC_DIR/keyboard.js" "$VERSION_SRC/"
cp "$SRC_DIR/node-panel.js" "$VERSION_SRC/"
cp "$SRC_DIR/tree-layout.js" "$VERSION_SRC/"

# 复制测试文件（可选，部署时不需要）
echo "📦 复制测试文件..."
mkdir -p "$VERSION_DIR/zsx-test"
cp "$PROJECT_DIR/zsx-test/test-framework.js" "$VERSION_DIR/zsx-test/" 2>/dev/null || true
cp "$PROJECT_DIR/zsx-test/test-runner.html" "$VERSION_DIR/zsx-test/" 2>/dev/null || true

# 记录版本信息
cat > "$VERSION_DIR/VERSION" << EOF
version=$VERSION
date=$(date -Iseconds)
git_commit=$(cd "$PROJECT_DIR" && git rev-parse --short HEAD 2>/dev/null || echo "unknown")
EOF

# 记录总版本号
echo "$VERSION" > "$DIST_DIR/../VERSION"

# 生成文件清单
echo "📋 文件清单:"
find "$VERSION_SRC" -type f | sort | while read f; do
  size=$(stat -c%s "$f" 2>/dev/null || stat -f%z "$f" 2>/dev/null)
  name="${f#$VERSION_DIR/}"
  printf "  %8s bytes  %s\n" "$size" "$name"
done

# 压缩打包
echo ""
echo "🗜️  压缩打包..."
cd "$DIST_DIR"
tar -czf "${VERSION}.tar.gz" "$VERSION"
PACKAGE_SIZE=$(stat -c%s "${VERSION}.tar.gz" 2>/dev/null || stat -f%z "${VERSION}.tar.gz" 2>/dev/null)
echo "  ${VERSION}.tar.gz ($(numfmt --to=iec $PACKAGE_SIZE 2>/dev/null || echo ${PACKAGE_SIZE} bytes))"

# 清理旧版本（保留最近 5 个）
echo ""
echo "🧹 清理旧版本..."
cd "$DIST_DIR"
ls -dt v*/ 2>/dev/null | tail -n +6 | while read old; do
  echo "  删除旧版本: $old"
  rm -rf "$old" "${old%/}.tar.gz"
done

echo ""
echo "✅ 打包完成: $VERSION"
echo "   目录: $VERSION_SRC"
echo "   压缩包: $DIST_DIR/${VERSION}.tar.gz"
echo ""
echo "📌 VERSION 文件内容:"
cat "$DIST_DIR/../VERSION"
