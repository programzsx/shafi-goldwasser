// node-panel.js — 节点详情面板（右侧抽屉 + Markdown 编辑器）

let panelEl = null;
let panelOpen = false;
let currentPanelNodeId = null;

function createPanel() {
  if (panelEl) return;
  panelEl = document.createElement('div');
  panelEl.id = 'nodePanel';
  panelEl.innerHTML = `
    <div class="panel-header">
      <h3 id="panelTitle">节点详情</h3>
      <div class="panel-tabs">
        <button class="panel-tab active" data-tab="edit">编辑</button>
        <button class="panel-tab" data-tab="preview">预览</button>
      </div>
      <button class="panel-close" title="关闭 (Esc)">✕</button>
    </div>
    <div class="panel-body" id="panelBody">
      <textarea id="panelEditor" placeholder="在此输入 Markdown 正文…"></textarea>
      <div id="panelPreview" style="display:none"></div>
    </div>
  `;
  document.body.appendChild(panelEl);

  // CSS
  const style = document.createElement('style');
  style.textContent = `
    #nodePanel {
      position: fixed; right: 0; top: 0; height: 100vh; width: 0;
      background: #fff; border-left: 1px solid #e0e0e0; z-index: 500;
      transition: width 0.25s ease; overflow: hidden;
      display: flex; flex-direction: column;
    }
    #nodePanel.open { width: 420px; }
    .panel-header {
      padding: 12px 16px; border-bottom: 1px solid #e0e0e0;
      display: flex; align-items: center; gap: 8px; flex-shrink: 0;
    }
    #panelTitle { font-size: 14px; color: #E53935; font-weight: 600; flex: 1; margin: 0; }
    .panel-tabs { display: flex; gap: 2px; }
    .panel-tab {
      padding: 4px 12px; border: 1px solid #e0e0e0; background: #f5f5f5;
      border-radius: 4px; cursor: pointer; font-size: 12px; color: #666;
    }
    .panel-tab.active { background: #E53935; color: #fff; border-color: #E53935; }
    .panel-close {
      background: none; border: none; font-size: 18px; color: #999; cursor: pointer; padding: 4px;
    }
    .panel-body { flex: 1; overflow-y: auto; padding: 16px; }
    #panelEditor {
      width: 100%; height: 100%; border: none; resize: none;
      font-family: "JetBrains Mono", "Fira Code", monospace;
      font-size: 13px; line-height: 1.6; outline: none; color: #333;
    }
    #panelPreview {
      font-size: 14px; line-height: 1.8; color: #333;
    }
    #panelPreview h1,#panelPreview h2,#panelPreview h3 { color: #E53935; margin: 16px 0 8px; }
    #panelPreview code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 13px; }
    #panelPreview pre { background: #1E1E1E; color: #aad; padding: 14px; border-radius: 8px; overflow-x: auto; }
    #panelPreview pre code { background: none; padding: 0; color: #aad; }
    #panelPreview blockquote { border-left: 3px solid #E53935; padding: 4px 12px; color: #888; margin: 12px 0; }
  `;
  document.head.appendChild(style);

  // 事件
  panelEl.querySelector('.panel-close').addEventListener('click', closePanel);
  panelEl.querySelectorAll('.panel-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  panelEl.querySelector('#panelEditor').addEventListener('input', debounce(() => {
    if (currentPanelNodeId && typeof onPanelContentChange === 'function') {
      onPanelContentChange(currentPanelNodeId, panelEl.querySelector('#panelEditor').value);
    }
  }, 500));
}

function openPanel(nodeId, label, content) {
  createPanel();
  currentPanelNodeId = nodeId;
  panelOpen = true;
  panelEl.classList.add('open');
  document.getElementById('panelTitle').textContent = label;
  const editor = document.getElementById('panelEditor');
  editor.value = content || '';
  updatePreview();
  // 默认显示编辑 tab
  switchTab('edit');
  editor.focus();
}

function closePanel() {
  if (!panelEl) return;
  panelEl.classList.remove('open');
  panelOpen = false;
  currentPanelNodeId = null;
  if (typeof onPanelClosed === 'function') onPanelClosed();
}

function isPanelOpen() {
  return panelOpen;
}

function switchTab(tab) {
  document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.panel-tab[data-tab="${tab}"]`).classList.add('active');
  document.getElementById('panelEditor').style.display = tab === 'edit' ? 'block' : 'none';
  document.getElementById('panelPreview').style.display = tab === 'preview' ? 'block' : 'none';
  if (tab === 'preview') updatePreview();
}

function updatePreview() {
  const md = document.getElementById('panelEditor').value;
  const preview = document.getElementById('panelPreview');
  preview.innerHTML = md ? simpleMarkdownRender(md) : '<p style="color:#ccc">暂无内容</p>';
}

// 简易 Markdown 渲染
function simpleMarkdownRender(md) {
  let html = md;
  // 代码块
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // 标题
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
  // 粗体
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // 引用
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  // 列表
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  // 段落
  const parts = html.split('\n\n');
  html = parts.map(p => {
    p = p.trim();
    if (!p) return '';
    if (p.startsWith('<h') || p.startsWith('<pre') || p.startsWith('<blockquote') || p.startsWith('<li')) return p;
    return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
  }).join('\n');
  return html;
}

function debounce(fn, delay) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

// 回调钩子
let onPanelContentChange = null;
let onPanelClosed = null;
