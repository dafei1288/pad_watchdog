<script setup>
// 遥控器：这个世界里家长手里那支东西。
// 播放＝开始，暂停＝结束，数字键＝定这次看多久（＝睡眠定时），红点＝正在录。
const props = defineProps({
  name: { type: String, default: '' },
  color: { type: String, default: '#999' },
  avatar: { type: String, default: '' },
  readout: { type: String, default: '--:--' },
  running: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  canStart: { type: Boolean, default: true },
  readoutLabel: { type: String, default: '本次定时' },
})
const emit = defineEmits(['digit', 'clear', 'play', 'stop'])
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '—', '0', 'C']
</script>

<template>
  <div class="remote" :style="{ '--kid': color }">
    <div class="label-tape">
      <img v-if="avatar?.startsWith('data:')" :src="avatar" alt="" aria-hidden="true" />
      <span v-else-if="avatar" aria-hidden="true">{{ avatar }}</span>
      <span v-else class="kid-dot" aria-hidden="true"></span>
      {{ name }}
    </div>

    <div class="dvr">
      <span class="dvr-win num" role="status" :aria-label="`${readoutLabel} ${readout}`">{{ readout }}</span>
      <span class="dvr-cap">{{ running ? '正在录' : readoutLabel }}</span>
    </div>

    <div class="pad">
      <div class="digits">
        <button
          v-for="k in KEYS"
          :key="k"
          type="button"
          class="key"
          :disabled="running || k === '—'"
          :aria-label="k === 'C' ? '清空定时' : `按 ${k}`"
          @click="k === 'C' ? emit('clear') : emit('digit', k)"
        >
          {{ k }}
        </button>
      </div>
      <div class="transport">
        <button
          type="button"
          class="key key-play"
          :disabled="busy || running || !canStart"
          :aria-label="`按播放开始计时${canStart ? '' : '（额度已用完）'}`"
          @click="emit('play')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5 L19 12 L8 19 Z" /></svg>
        </button>
        <button
          type="button"
          class="key key-stop"
          :disabled="busy || !running"
          aria-label="按暂停结束计时"
          @click="emit('stop')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="6" width="3.6" height="12" /><rect x="13.4" y="6" width="3.6" height="12" /></svg>
        </button>
        <span class="rec-dot" :class="{ on: running }" :aria-label="running ? '正在录' : '没有在录'" role="img"></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.remote {
  position: relative; width: 200px; flex: none; box-sizing: border-box;
  background: var(--shell); border: 1px solid var(--key-deep); border-radius: 10px;
  padding: 12px 14px 14px;
  box-shadow:
    0 4px 0 var(--key-deep),
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    inset 0 -2px 0 rgba(0, 0, 0, 0.06);
}
/* 发射头：遥控器顶上那颗 */
.remote::before {
  content: ''; position: absolute; left: 50%; top: 5px; margin-left: -11px;
  width: 22px; height: 4px; border-radius: 2px; background: rgba(34, 38, 43, 0.35);
}
.pad {
  display: flex; gap: var(--s2);
  padding: 8px; border-radius: 6px; background: rgba(34, 38, 43, 0.05);
  box-shadow: inset 0 1px 2px rgba(34, 38, 43, 0.12);
}
.label-tape {
  display: inline-flex; align-items: center; gap: 5px; max-width: 100%;
  background: var(--sheet); border: 1px solid var(--rule); border-radius: 2px;
  padding: 2px 8px; font-size: var(--t-note); font-weight: 700;
  transform: rotate(-2deg);
  box-shadow: 0 1px 1px rgba(34, 38, 43, 0.12);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.label-tape .kid-dot { width: 7px; height: 7px; }
.label-tape img { width: 15px; height: 15px; border-radius: 50%; object-fit: cover; }

.dvr {
  margin: var(--s2) 0; padding: 7px 10px;
  background: #20242a; border-radius: 6px; border: 1px solid #14171b;
  display: flex; align-items: baseline; justify-content: space-between; gap: 6px;
}
.dvr-win { color: var(--timer-lit); font-size: 22px; font-weight: 700; letter-spacing: 0.04em; }
.dvr-cap { color: #9aa3ab; font-size: 11px; }


.digits { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; flex: 1; }
.key {
  font: inherit; font-size: 15px; cursor: pointer; min-height: 34px;
  color: var(--ink); background: var(--key);
  border: 1px solid var(--key-deep); border-radius: 6px;
  box-shadow: 0 2px 0 var(--key-deep), inset 0 1px 0 rgba(255, 255, 255, 0.65);
  transition: transform 0.08s ease, box-shadow 0.08s ease, background 0.12s ease;
}
.key:hover { transform: translateY(-1px); box-shadow: 0 3px 0 var(--key-deep); }
.key:active { transform: translateY(1px); box-shadow: 0 0 0 var(--key-deep); }
.key:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: 0 2px 0 var(--key-deep); }

.transport { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.key-play { background: var(--play); border-color: #24603d; box-shadow: 0 2px 0 #24603d; width: 46px; height: 46px; padding: 0; }
.key-play svg { width: 20px; height: 20px; fill: #fff; }
.key-stop { width: 46px; height: 38px; padding: 0; }
.key-stop svg { width: 18px; height: 18px; fill: var(--ink); }
.rec-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: rgba(217, 58, 43, 0.25); border: 1px solid var(--key-deep);
}
.rec-dot.on { background: var(--rec); border-color: #a72c20; animation: rec-blink 1.4s ease-in-out infinite; }
@keyframes rec-blink { 50% { opacity: 0.35; } }

@media (max-width: 600px) {
  .remote { width: 100%; }
  .dvr-win { font-size: 20px; }
}
</style>
