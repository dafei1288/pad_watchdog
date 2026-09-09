<script setup>
import { RouterView, RouterLink } from 'vue-router'
</script>

<template>
  <div class="layout">
    <header class="topbar">
      <h1>⏰ Pad 时间管家</h1>
      <nav>
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
  --brand: #6c5ce7;
  --brand-2: #8e7cf3;
  --danger: #e17055;
  --ok: #00b894;
  --ink: #2d3436;
  --ink-2: #636e72;
  --line: #ececf4;
}

body {
  font-family: 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  background: linear-gradient(160deg, #f3f0ff 0%, #fdf6ee 55%, #eef7f4 100%);
  background-attachment: fixed;
  color: var(--ink);
  margin: 0;
}

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
  background: linear-gradient(135deg, var(--brand), var(--brand-2));
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
.big.danger { background: none; color: var(--danger); }
.danger { color: var(--danger); }

button {
  padding: 7px 16px; border: 1px solid var(--line); border-radius: 999px;
  background: #fff; color: var(--ink); cursor: pointer; font-size: 14px;
  transition: all 0.18s;
}
button:hover { border-color: var(--brand-2); color: var(--brand); transform: translateY(-1px); }
button.primary {
  background: linear-gradient(135deg, var(--brand), var(--brand-2));
  color: #fff; border: none; box-shadow: 0 3px 10px rgba(108, 92, 231, 0.3);
}
button.primary:hover { transform: translateY(-1px); box-shadow: 0 5px 14px rgba(108, 92, 231, 0.4); }
button.danger-btn {
  background: linear-gradient(135deg, #e17055, #d63031);
  color: #fff; border: none; box-shadow: 0 3px 10px rgba(214, 48, 49, 0.3);
}
button:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
button.link { border: none; color: #b2bec3; text-decoration: underline; padding: 0 4px; }
button.link:hover { color: var(--danger); }

input, select {
  padding: 7px 10px; border: 1px solid var(--line); border-radius: 10px;
  font-size: 14px; color: var(--ink); background: #fbfbfd; outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
input:focus, select:focus { border-color: var(--brand-2); box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.12); }

.tag {
  font-size: 12px; color: var(--brand); background: rgba(108, 92, 231, 0.08);
  border-radius: 999px; padding: 2px 8px;
}

ul { padding-left: 18px; }
li { margin-bottom: 6px; }
</style>
