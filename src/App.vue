<script setup>
import { RouterView, RouterLink } from 'vue-router'
</script>

<template>
  <div class="sheet-page">
    <header class="masthead">
      <h1>Pad 时间管家</h1>
      <nav class="tabs" aria-label="主导航">
        <RouterLink to="/">本周</RouterLink>
        <RouterLink to="/calendar">月表</RouterLink>
        <RouterLink to="/stats">并排</RouterLink>
        <RouterLink to="/settings">设置</RouterLink>
      </nav>
    </header>
    <main class="page">
      <RouterView />
    </main>
  </div>
</template>

<style>
:root {
  /* 纸与墨 */
  --sheet: #f4f1e8;      /* 节目单纸：页面地面 */
  --sheet-2: #e9e4d6;    /* 表头与次纸 */
  --ink: #22262b;        /* 印刷墨 13.47:1 */
  --ink-2: #5a6167;      /* 次级墨 5.57:1 */
  --rule: #c6cbd0;       /* 表格线（非文字） */
  /* 遥控器 */
  --shell: #e7e4dc;      /* 壳 */
  --key: #cfcbc0;        /* 键 */
  --key-deep: #b4afa3;
  /* 只有一种红：录制点 / 正在播出 / 红笔 */
  --rec: #d93a2b;        /* 图形 */
  --rec-ink: #b02a1f;    /* 红笔文字 5.82:1 */
  --play: #2e7d4f;       /* 播放绿（图形，白字 5.05） */
  --play-ink: #1f5c39;   /* 文字 7.02:1 */
  --timer: #b4761a;      /* 定时琥珀（图形） */
  --timer-ink: #7a4e0c;  /* 文字 6.36:1 */
  --timer-lit: #e8a63c;  /* 深色显示窗上的琥珀读数 7.39:1 */
  --wood: #b08a5e;       /* 电视柜木色（非文字） */
  --focus: #1f5c39;      /* 焦点环 7.02:1 */
  /* 节奏与字号 */
  --s1: 6px; --s2: 10px; --s3: 16px; --s4: 26px; --s5: 40px;
  --t-note: 12px; --t-body: 14.5px; --t-read: 19px; --t-big: 40px;
}

html { -webkit-text-size-adjust: 100%; }

body {
  font-family: 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  font-size: var(--t-body);
  background: var(--sheet);
  color: var(--ink);
  margin: 0;
  color-scheme: light;
  caret-color: var(--rec);
  scrollbar-color: var(--rule) transparent;
}

::selection { background: rgba(217, 58, 43, 0.16); }

/* 数字一律等宽对齐：节目单是表，列要对得上 */
.num { font-variant-numeric: tabular-nums; letter-spacing: 0.01em; }

.sheet-page { max-width: 900px; margin: 0 auto; padding: 0 var(--s3) var(--s5); }

/* 抬头与页签：印在纸上的签条，不是浮起来的卡片 */
.masthead {
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: var(--s3); flex-wrap: wrap;
  padding: var(--s4) 0 0;
  border-bottom: 2px solid var(--ink);
}
.masthead h1 { font-size: 21px; margin: 0 0 8px; letter-spacing: 0.02em; }
.tabs { display: flex; gap: 2px; }
.tabs a {
  display: inline-block; padding: 6px 15px 7px; text-decoration: none;
  color: var(--ink-2); font-size: var(--t-body);
  background: var(--sheet-2); border: 1px solid var(--rule); border-bottom: none;
}
.tabs a:hover { color: var(--ink); background: var(--sheet); }
.tabs a.router-link-active { color: var(--ink); font-weight: 700; background: var(--sheet); box-shadow: inset 0 3px 0 var(--rec); }

.page { padding-top: var(--s3); }

/* 版块：靠印刷横线分栏，不画卡片盒子 */
.block { border-top: 2px solid var(--ink); padding-top: var(--s2); margin-bottom: var(--s4); }
.block-head { display: flex; align-items: baseline; justify-content: space-between; gap: var(--s2); flex-wrap: wrap; }
h2 { font-size: 13px; margin: 0 0 var(--s2); color: var(--ink-2); font-weight: 700; letter-spacing: 0.14em; }
.block h2 { color: var(--ink); }

/* 表格：节目单的格与线 */
.table { border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); }
.row { display: grid; align-items: center; border-bottom: 1px solid var(--rule); }
.row:last-child { border-bottom: none; }
.cell { padding: 5px 6px; border-right: 1px solid var(--rule); min-width: 0; }
.cell:last-child { border-right: none; }
.head-row { background: var(--sheet-2); font-size: var(--t-note); color: var(--ink-2); }

/* 读数：印在纸上的大数字 */
.read { font-size: var(--t-read); }
.read-big { font-size: var(--t-big); line-height: 1; font-weight: 700; }

/* 红笔：圈、划、星，只有这一种红 */
.redpen { color: var(--rec-ink); }
.circled { box-shadow: inset 0 0 0 2px rgba(217, 58, 43, 0.55); border-radius: 50%; }
.struck { text-decoration: line-through; text-decoration-color: var(--rec); text-decoration-thickness: 2px; }
.pen-note {
  display: inline-block; padding: 2px 9px; color: var(--rec-ink);
  border: 1.5px solid var(--rec); border-radius: 3px;
  transform: rotate(-1.2deg); font-size: var(--t-note); background: var(--sheet);
}

/* 键与按钮：有行程 */
.btn {
  font: inherit; cursor: pointer; padding: 7px 15px;
  color: var(--ink); background: var(--key);
  border: 1px solid var(--key-deep); border-radius: 6px;
  box-shadow: 0 2px 0 var(--key-deep);
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}
.btn:hover { transform: translateY(-1px); box-shadow: 0 3px 0 var(--key-deep); }
.btn:active { transform: translateY(1px); box-shadow: 0 0 0 var(--key-deep); }
.btn-play { background: var(--play); border-color: #24603d; color: #fff; box-shadow: 0 2px 0 #24603d; }
.btn-play:active { box-shadow: 0 0 0 #24603d; }
.btn-rec { background: var(--rec); border-color: #a72c20; color: #fff; box-shadow: 0 2px 0 #a72c20; }
.btn-rec:active { box-shadow: 0 0 0 #a72c20; }
.btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: 0 2px 0 var(--key-deep); }
.btn-quiet { background: none; border: none; box-shadow: none; color: var(--ink-2); text-decoration: underline; text-underline-offset: 3px; padding: 7px 4px; }
.btn-quiet:hover { color: var(--ink); transform: none; box-shadow: none; }

/* 印刷空格：要填的地方就用下划线 */
.blank {
  font: inherit; color: var(--ink); background: none;
  border: none; border-bottom: 1.5px solid var(--rule); border-radius: 0;
  padding: 3px 2px;
}
.blank:focus, .blank:focus-visible { outline: none; border-bottom-color: var(--focus); box-shadow: 0 2px 0 var(--focus); }
.blank::placeholder { color: var(--ink-2); }

.tag { font-size: var(--t-note); border: 1px solid var(--rule); padding: 1px 7px; color: var(--ink-2); }
.tag-rec { color: var(--rec-ink); border-color: var(--rec); }
.muted { color: var(--ink-2); }
.danger { color: var(--rec-ink); }
.tiny { font-size: var(--t-note); }
.kid-dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: var(--kid, var(--rule)); border: 1px solid var(--ink); flex: none; }

:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.blank:focus-visible { outline: none; }

/* 展开：用 grid-template-rows，不用 height */
.unfold { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.26s ease; }
.unfold > * { overflow: hidden; }
.unfold.open { grid-template-rows: 1fr; }

@media (max-width: 600px) {
  .sheet-page { padding: 0 12px var(--s4); }
  .masthead { padding-top: var(--s3); }
  .masthead h1 { font-size: 18px; }
  .tabs a { padding: 6px 11px 7px; font-size: 13px; }
}

@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
  /* 不做动画时，正在播出那条红杠是一条完整的实线，而不是定格在半截 */
  .live-bar { animation: none !important; transform: none !important; }
}
</style>
