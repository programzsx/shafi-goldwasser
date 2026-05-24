#!/bin/bash
# test-deploy.sh — 部署测试脚本
# 用法: bash zsx-build-deploy/test-deploy.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPORT_FILE="$SCRIPT_DIR/deploy-test-report.md"
PORT=8004
BASE_URL="http://localhost:$PORT"
PASSED=0
FAILED=0
RESULTS=""

# 测试函数
test_case() {
  local id="$1"
  local name="$2"
  local method="$3"
  local expected="$4"
  local cmd="$5"

  local start=$(date +%s%N)
  local output
  output=$(eval "$cmd" 2>&1) || true
  local exit_code=$?
  local end=$(date +%s%N)
  local duration=$(( (end - start) / 1000000 )) # ms

  if echo "$output" | grep -q "$expected"; then
    local status="✅ PASS"
    PASSED=$((PASSED + 1))
  else
    local status="❌ FAIL"
    FAILED=$((FAILED + 1))
  fi

  RESULTS+="| $id | $name | $status | ${duration}ms |\n"
  
  if [ "$status" = "❌ FAIL" ]; then
    echo "  ❌ $id $name — 期望包含: \"$expected\""
    echo "     实际输出: $(echo "$output" | head -1)"
  fi
}

echo "========================================="
echo "  部署测试 — 端口 $PORT"
echo "========================================="

# 检查服务是否在运行
echo ""
echo "🔍 检查服务状态..."
if ! curl -s -o /dev/null -w '' "$BASE_URL/src/index.html" 2>/dev/null; then
  echo "❌ 服务未运行！请先执行部署: bash zsx-build-deploy/deploy.sh"
  exit 1
fi
echo "✅ 服务正在运行"

# ─── 执行测试 ───
echo ""
echo "🧪 执行测试用例..."

test_case "DEP-01" "服务端口可达" "curl" "200" \
  "curl -s -o /dev/null -w '%{http_code}' $BASE_URL/src/index.html"

test_case "DEP-02" "index.html Content-Type" "curl" "text/html" \
  "curl -s -I $BASE_URL/src/index.html | grep -i content-type"

test_case "DEP-03" "index.html 包含标题" "curl" "Mindmap Blog" \
  "curl -s $BASE_URL/src/index.html"

test_case "DEP-04" "app.js 可加载" "curl" "function" \
  "curl -s $BASE_URL/src/app.js"

test_case "DEP-05" "data.js 可加载" "curl" "DEFAULT_MINDMAP" \
  "curl -s $BASE_URL/src/data.js"

test_case "DEP-06" "canvas.js 可加载" "curl" "function drawNode" \
  "curl -s $BASE_URL/src/canvas.js"

test_case "DEP-07" "tree-layout.js 可加载" "curl" "function doLayout" \
  "curl -s $BASE_URL/src/tree-layout.js"

test_case "DEP-08" "drill-down.js 可加载" "curl" "function drillDown" \
  "curl -s $BASE_URL/src/drill-down.js"

test_case "DEP-09" "export.js 可加载" "curl" "function exportHTML" \
  "curl -s $BASE_URL/src/export.js"

test_case "DEP-10" "node-panel.js 可加载" "curl" "function openPanel" \
  "curl -s $BASE_URL/src/node-panel.js"

test_case "DEP-11" "keyboard.js 可加载" "curl" "function setupKeyboard" \
  "curl -s $BASE_URL/src/keyboard.js"

test_case "DEP-12" "8个JS文件HTTP状态均为200" "curl" "200" \
  "for f in app data canvas tree-layout drill-down export node-panel keyboard; do curl -s -o /dev/null -w '%{http_code}' $BASE_URL/src/\$f.js; done | sort -u"

test_case "DEP-13" "不存在的路径返回404" "curl" "404" \
  "curl -s -o /dev/null -w '%{http_code}' $BASE_URL/nonexistent.html"

test_case "DEP-14" "响应时间 < 100ms" "curl" "200" \
  "curl -s -o /dev/null -w '%{http_code}' --max-time 0.1 $BASE_URL/src/index.html"

test_case "DEP-15" "index.html 大于 2KB" "curl" "PASS_OK" \
  "curl -s $BASE_URL/src/index.html | wc -c | awk '{if(\$1>2000) print \"PASS_OK\"; else print \"FAIL\"}'"

# ─── 生成报告 ───
TOTAL=$((PASSED + FAILED))
PASS_RATE="0%"
if [ $TOTAL -gt 0 ]; then
  PASS_RATE="$(awk "BEGIN {printf \"%.1f\", $PASSED * 100 / $TOTAL}")%"
fi

cat > "$REPORT_FILE" << EOF
# Mindmap Blog — 部署测试报告

> 日期: $(date -Iseconds) | 端口: $PORT | 服务: Python http.server

---

## 测试概要

| 指标 | 数值 |
|------|------|
| 测试用例总数 | $TOTAL |
| 通过 | $PASSED ✅ |
| 失败 | $FAILED |
| 通过率 | $PASS_RATE |

---

## 测试详情

| 用例ID | 测试项 | 结果 | 耗时 |
|--------|--------|:--:|------|
$(echo -e "$RESULTS")

---

## 服务信息

- **端口**: $PORT
- **地址**: $BASE_URL/src/index.html
- **部署版本**: $(cat "$SCRIPT_DIR/VERSION" 2>/dev/null || echo "unknown")
- **Git Commit**: $(cd "$(dirname "$SCRIPT_DIR")" && git rev-parse --short HEAD 2>/dev/null || echo "unknown")
- **PID**: $(cat "$SCRIPT_DIR/deploy.pid" 2>/dev/null || echo "N/A")

---

## 结论

EOF

if [ $FAILED -eq 0 ]; then
  echo "✅ **全部测试通过！** 服务部署成功，所有资源可正常访问。" >> "$REPORT_FILE"
else
  echo "⚠️ **存在 $FAILED 项失败。** 请检查服务日志和网络配置。" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "📋 测试脚本: \`zsx-build-deploy/test-deploy.sh\`" >> "$REPORT_FILE"

# ─── 输出到终端 ───
echo ""
echo "========================================="
echo "  测试完成: $PASSED/$TOTAL 通过 ($PASS_RATE)"
echo "========================================="

if [ $FAILED -gt 0 ]; then
  echo "❌ 存在失败用例！"
  exit 1
else
  echo "✅ 全部通过！"
fi

echo ""
echo "📄 报告已生成: $REPORT_FILE"
