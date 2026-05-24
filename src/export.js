// export.js — 导出功能（JSON / HTML / Markdown）

// ===================== 导出 JSON =====================
function exportJSON(mindmap) {
  const data = JSON.stringify(mindmap, null, 2);
  downloadFile(data, `${mindmap.title || 'mindmap'}.json`, 'application/json');
}

// ===================== 导出 Markdown =====================
function exportMarkdown(root) {
  let md = '';
  function walk(node, depth) {
    const prefix = '#'.repeat(Math.min(depth + 1, 6));
    md += `${prefix} ${node.label}\n\n`;
    if (node.content) {
      md += node.content + '\n\n';
    }
    if (node.children) {
      node.children.forEach(c => walk(c, depth + 1));
    }
  }
  walk(root, 0);
  downloadFile(md, `${root.label || 'mindmap'}.md`, 'text/markdown');
}

// ===================== 导出 HTML =====================
function exportHTML(mindmap) {
  const dataJSON = JSON.stringify(mindmap);

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${mindmap.title || 'Mindmap'}</title>
<style>
:root{--bg:#f5f5f5;--card:#fff;--text:#212121;--muted:#888;--red:#E53935;--border:#e0e0e0}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,'Segoe UI','PingFang SC',sans-serif;background:var(--bg);color:var(--text);height:100vh;display:flex;flex-direction:column;overflow:hidden}
.header{background:#fff;border-bottom:1px solid var(--border);padding:0 16px;display:flex;align-items:center;height:44px;gap:8px;flex-shrink:0}
.header .logo{color:var(--red);font-size:15px;font-weight:700}
.breadcrumb{display:flex;align-items:center;gap:4px;font-size:12px;flex:1;overflow:hidden}
.breadcrumb span{color:var(--muted)}
.breadcrumb a{color:#1976D2;text-decoration:none;cursor:pointer;white-space:nowrap}
.breadcrumb a:hover{text-decoration:underline}
.breadcrumb a.current{color:var(--red);font-weight:600}
.btn{background:#f5f5f5;border:1px solid var(--border);color:#666;padding:5px 12px;border-radius:6px;font-size:12px;cursor:pointer}
.btn:hover{background:#e8e8e8}
.main{display:flex;flex:1;overflow:hidden;position:relative}
.canvas-wrap{flex:1;overflow:auto;padding:40px;user-select:none}
.canvas{position:relative;min-width:fit-content;min-height:400px}
.node-row{display:flex;align-items:center;margin:6px 0}
.node{padding:8px 16px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;border:1.5px solid transparent;transition:all .12s;white-space:nowrap;position:relative}
.node:hover{border-color:var(--red)}
.node.root{background:var(--red);color:#fff;font-size:15px;font-weight:700;padding:10px 20px;border-radius:16px}
.node.has-content::after{content:'';position:absolute;bottom:3px;right:5px;width:5px;height:5px;border-radius:50%;background:var(--red)}
.node.collapsed::before{content:'+';margin-right:4px;color:var(--red);font-size:11px}
.children{margin-left:48px;position:relative}
.children::before{content:'';position:absolute;left:-24px;top:0;bottom:50%;border-left:2px solid #ddd;border-bottom:2px solid #ddd;width:24px}
.panel{width:0;overflow:hidden;background:#fff;border-left:1px solid var(--border);transition:width .25s;flex-shrink:0;display:flex;flex-direction:column}
.panel.open{width:420px}
.panel-header{padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.panel-header h3{font-size:14px;color:var(--red)}
.panel-close{background:none;border:none;color:var(--muted);font-size:18px;cursor:pointer}
.panel-body{flex:1;overflow-y:auto;padding:16px;font-size:14px;line-height:1.8}
.panel-body h2{font-size:18px;color:#333;margin-bottom:12px}
.panel-body h3{font-size:15px;color:#555;margin:12px 0 6px}
.panel-body code{background:#f0f0f0;padding:2px 6px;border-radius:3px;font-size:13px}
.panel-body pre{background:#1E1E1E;color:#aad;padding:14px;border-radius:8px;overflow-x:auto}
.panel-body pre code{background:none;padding:0}
.panel-body blockquote{border-left:3px solid var(--red);padding:4px 12px;color:#888;margin:12px 0;background:#fff9f9;border-radius:0 6px 6px 0}
.statusbar{background:#fff;border-top:1px solid var(--border);padding:4px 16px;font-size:11px;color:#aaa;display:flex;gap:16px;flex-shrink:0;height:26px;align-items:center}
.search-wrap{position:relative}
.search-input{background:#f5f5f5;border:1px solid var(--border);color:#333;padding:5px 10px;border-radius:6px;font-size:12px;width:150px}
.search-input:focus{outline:none;border-color:var(--red)}
</style>
</head>
<body>
<div class="header">
  <span class="logo">🧠 ${mindmap.title || 'Mindmap'}</span>
  <div class="breadcrumb" id="breadcrumb"></div>
  <div class="search-wrap">
    <input class="search-input" id="searchInput" placeholder="🔍 搜索..." oninput="doSearch()" onfocus="this.select()">
  </div>
</div>
<div class="main">
  <div class="canvas-wrap"><div class="canvas" id="canvas"></div></div>
  <div class="panel" id="panel">
    <div class="panel-header">
      <h3 id="panelTitle">节点详情</h3>
      <button class="panel-close" onclick="closePanel()">✕</button>
    </div>
    <div class="panel-body" id="panelBody"><p style="color:#ccc">👈 点击节点查看正文</p></div>
  </div>
</div>
<div class="statusbar">
  <span id="nodeCount"></span>
  <span>|</span>
  <span>右键节点下钻 · 点击节点查看详情 · Backspace返回上级</span>
</div>
<script>
// DATA
var mindmap = ${dataJSON};
var drillStack = [];
var currentNodeId = null;

// FIND
function findNode(root,id){
  if(root.id===id)return root;
  if(!root.children)return null;
  for(var c of root.children){var r=findNode(c,id);if(r)return r;}
  return null;
}
function getDisplayRoot(){return drillStack.length?findNode(mindmap.root,drillStack[drillStack.length-1].nodeId)||mindmap.root:mindmap.root;}

// COUNT
function countNodes(n){var c=1;if(n.children)n.children.forEach(function(ch){c+=countNodes(ch)});return c;}

// RENDER
function rBreadcrumb(){
  var el=document.getElementById('breadcrumb');
  var h='<span>🏠</span> <a href="#" onclick="drillTo(-1);return false">'+mindmap.root.label+'</a>';
  drillStack.forEach(function(s,i){
    h+=' <span>›</span> ';
    h+=i===drillStack.length-1?'<a class="current">'+s.label+'</a>':'<a href="#" onclick="drillTo('+i+');return false">'+s.label+'</a>';
  });
  el.innerHTML=h;
}
function rNode(n){
  var cls='node';
  if(n.id===getDisplayRoot().id)cls+=' root';
  if(n.content&&n.content.length)cls+=' has-content';
  if(n.collapsed)cls+=' collapsed';
  var h='<span class="'+cls+'" onclick="selNode(\\''+n.id+'\\')" oncontextmenu="drillNode(\\''+n.id+'\\',\\''+n.label.replace(/'/g,"\\\\'")+'\\');return false">'+n.label+'</span>';
  if(n.children&&n.children.length&&!n.collapsed){
    h+='<div class="children">';
    n.children.forEach(function(c){h+=rNode(c);});
    h+='</div>';
  }
  return h;
}
function render(){
  var root=getDisplayRoot();
  document.getElementById('canvas').innerHTML=rNode(root);
  document.getElementById('nodeCount').textContent='共 '+countNodes(root)+' 个节点';
  rBreadcrumb();
}

// PANEL
function selNode(id){
  currentNodeId=id;
  var node=findNode(mindmap.root,id);
  if(!node)return;
  document.getElementById('panelTitle').textContent=node.label;
  var body=document.getElementById('panelBody');
  if(node.content){
    var html=node.content;
    html=html.replace(/\`\`\`(\\w*)\\n([\\s\\S]*?)\`\`\`/g,'<pre><code>$2</code></pre>');
    html=html.replace(/\`([^\`]+)\`/g,'<code>$1</code>');
    html=html.replace(/^### (.+)$/gm,'<h3>$1</h3>');
    html=html.replace(/^## (.+)$/gm,'<h2>$1</h2>');
    html=html.replace(/^# (.+)$/gm,'<h2>$1</h2>');
    html=html.replace(/\\*\\*(.+?)\\*\\*/g,'<strong>$1</strong>');
    html=html.replace(/^> (.+)$/gm,'<blockquote>$1</blockquote>');
    html=html.replace(/^- (.+)$/gm,'<li>$1</li>');
    html=html.replace(/\\n\\n/g,'</p><p>');
    body.innerHTML='<p>'+html+'</p>';
  }else{body.innerHTML='<p style="color:#ccc">暂无正文内容</p>';}
  document.getElementById('panel').classList.add('open');
}
function closePanel(){document.getElementById('panel').classList.remove('open');currentNodeId=null;}

// DRILL
function drillNode(id,label){drillStack.push({nodeId:id,label:label});currentNodeId=null;closePanel();render();}
function drillTo(idx){idx<0?drillStack=[]:drillStack=drillStack.slice(0,idx+1);currentNodeId=null;closePanel();render();}

// KEYBOARD
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){if(document.getElementById('panel').classList.contains('open'))closePanel();else if(drillStack.length){drillStack.pop();closePanel();render();}}
  if(e.key==='Backspace'&&!e.target.closest('input')&&drillStack.length){drillStack.pop();closePanel();render();}
  if(e.key==='/'&&!e.target.closest('input')){e.preventDefault();document.getElementById('searchInput').focus();}
});

// SEARCH
function doSearch(){
  var q=document.getElementById('searchInput').value.trim().toLowerCase();
  if(!q)return;
  var results=[];(function search(n,path){
    var p=path?path+' › '+n.label:n.label;
    if(n.label.toLowerCase().indexOf(q)>-1||(n.content&&n.content.toLowerCase().indexOf(q)>-1))results.push({node:n,path:p});
    if(n.children)n.children.forEach(function(c){search(c,p)});
  })(mindmap.root,'');
  if(results.length){
    var sel=results[0];
    drillStack=[];var parts=sel.path.split(' › ');
    for(var i=1;i<parts.length;i++){(function walk(n){
      if(n.label===parts[i]){drillStack.push({nodeId:n.id,label:n.label});return;}
      if(n.children)n.children.forEach(walk);
    })(mindmap.root);}
    currentNodeId=sel.node.id;render();selNode(sel.node.id);
  }
}

render();
</script>
</body>
</html>`;

  downloadFile(html, `${mindmap.title || 'mindmap'}.html`, 'text/html');
}

// ===================== 工具函数 =====================
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 从本地文件加载 JSON
function loadFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
