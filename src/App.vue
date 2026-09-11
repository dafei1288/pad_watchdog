<script setup>
import { RouterView, RouterLink } from 'vue-router'
</script>

<template>
  <div class="layout">
    <header class="topbar">
      <h1>⏰ Pad 时间管家</h1>
      <nav aria-label="主导航">
        <RouterLink to="/">查看</RouterLink>
        <RouterLink to="/calendar">日历</RouterLink>
        <RouterLink to="/stats">统计对比</RouterLink>
        <RouterLink to="/settings">配置</RouterLink>
      </nav>
    </header>
    <main class="page">
      <RouterView />
    </main>
  </div>
</template>

<style>
:root {
  /* 品牌 */
  --brand: #6c5ce7;        /* 白底 4.86:1：用于正文级紫色文字与描边 */
  --brand-2: #8e7cf3;      /* 仅用于 ≥24px 展示文字的渐变末端（3.32:1 ≥ 大字号 3:1） */
  --brand-deep: #7c3aed;   /* 控件渐变末端：白字 5.70:1 */
  /* 语义 */
  --danger-ink: #c0392b;   /* 危险文字 5.44:1 */
  --danger-fill-1: #d63031; /* 危险按钮渐变：白字 4.85:1 */
  --danger-fill-2: #b8402a; /* 危险按钮渐变：白字 5.52:1 */
  --ok: #0b7d5f;           /* 成功文字 5.11:1 */
  --ok-fill: #00b894;      /* 进度条填充（非文字） */
  /* 墨色 */
  --ink: #2d3436;
  --ink-2: #636e72;        /* 次级文字 5.24:1 */
  /* 线面 */
  --line: #ececf4;         /* 卡片与分隔线（非控件边界） */
  --line-2: #c8c8dc;       /* 输入控件边界 1.65:1 */
  --field: #fbfbfd;
  /* 其他 */
  --star: #c07d00;         /* 星标填充 3.40:1 */
  --ring: rgba(108, 92, 231, 0.32);
}

html { -webkit-text-size-adjust: 100%; }

body {
  font-family: 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  background: linear-gradient(160deg, #f3f0ff 0%, #fdf6ee 55%, #eef7f4 100%);
  background-attachment: fixed;
  color: var(--ink);
  margin: 0;
  color-scheme: light;
  scrollbar-color: var(--line-2) transparent;
}

::selection { background: rgba(108, 92, 231, 0.18); }

.layout { max-width: 860px; margin: 0 auto; }

.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px 10px; flex-wrap: wrap; gap: 10px;
}
.topbar h1 { font-size: 22px; margin: 0; letter-spacing: 1px; }
.topbar nav {
  display: flex; gap: 4px; background: rgba(255, 255, 255, 0.7);
  padding: 4px; border-radius: 999px; box-shadow: 0 2px 10px rgba(108, 92, 231, 0.08);
}
.topbar nav a {
  padding: 7px 18px; border-radius: 999px; color: var(--ink-2);
  text-decoration: none; font-size: 14px; transition: all 0.2s;
}
.topbar nav a:hover { color: var(--brand); }
.topbar nav a.router-link-active {
  background: linear-gradient(135deg, var(--brand), var(--brand-deep));
  color: #fff; box-shadow: 0 2px 8px rgba(108, 92, 231, 0.35);
}

.page { padding: 4px 20px 32px; }

h2 { font-size: 15px; margin: 0 0 10px; color: var(--ink-2); font-weight: 600; letter-spacing: 0.5px; }

.card {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 16px;
  padding: 18px 20px;
  margin-bottom: 14px;
  box-shadow: 0 4px 18px rgba(45, 52, 54, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(4px);
}

.big {
  font-size: 34px; font-weight: 800; margin: 6px 0;
  background: linear-gradient(135deg, var(--brand), var(--brand-2));
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.big.danger { background: none; color: var(--danger-ink); }
.danger { color: var(--danger-ink); }
.ok { color: var(--ok); }

button {
  padding: 7px 16px; border: 1px solid var(--line); border-radius: 999px;
  background: #fff; color: var(--ink); cursor: pointer; font-size: 14px;
  transition: all 0.18s;
}
button:hover { border-color: var(--brand-2); color: var(--brand); transform: translateY(-1px); }
button.primary {
  background: linear-gradient(135deg, var(--brand), var(--brand-deep));
  color: #fff; border: none; box-shadow: 0 3px 10px rgba(108, 92, 231, 0.3);
}
button.primary:hover { transform: translateY(-1px); box-shadow: 0 5px 14px rgba(108, 92, 231, 0.4); }
button.danger-btn {
  background: linear-gradient(135deg, var(--danger-fill-1), var(--danger-fill-2));
  color: #fff; border: none; box-shadow: 0 3px 10px rgba(214, 48, 49, 0.3);
}
button:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
button.link {
  border: none; background: none; color: var(--ink-2); text-decoration: underline;
  text-underline-offset: 3px; padding: 6px 8px; margin: -6px -4px; border-radius: 8px;
}
button.link:hover { color: var(--danger-ink); background: rgba(192, 57, 43, 0.06); transform: none; }

input, select {
  padding: 7px 10px; border: 1px solid var(--line-2); border-radius: 10px;
  font-size: 14px; color: var(--ink); background: var(--field); outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
input::placeholder { color: var(--ink-2); }
input:focus, select:focus { border-color: var(--brand); box-shadow: 0 0 0 3px var(--ring); }

/* 键盘焦点环：鼠标点击不触发，输入框已有自身焦点样式 */
:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
input:focus-visible, select:focus-visible { outline: none; }

.tag {
  font-size: 12px; color: var(--brand-deep); background: rgba(108, 92, 231, 0.08);
  border-radius: 999px; padding: 2px 8px;
}

ul { padding-left: 18px; }
li { margin-bottom: 6px; }

@media (max-width: 600px) {
  .topbar { padding: 14px 12px 8px; }
  .page { padding: 4px 12px 28px; }
  .card { padding: 14px; border-radius: 14px; }
}

@media (prefers-reduced-motion: reduce) {
  * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
}
</style>
