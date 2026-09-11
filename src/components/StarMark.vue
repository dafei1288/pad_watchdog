<script setup>
import { STAR_PATHS } from './starPath'

// 评分＝在节目单那格上打星：用红笔点几下，点满就是五分。0 = 未评。
const props = defineProps({
  modelValue: { type: Number, default: 0 },
  label: { type: String, default: '评分' },
})
const emit = defineEmits(['update:modelValue'])

const STARS = STAR_PATHS

function mark(i) {
  emit('update:modelValue', i === props.modelValue ? 0 : i)
}
</script>

<template>
  <span class="stars" role="group" :aria-label="`${label}：${modelValue} 分`">
    <button
      v-for="i in 5"
      :key="i"
      type="button"
      class="star-mark"
      :class="{ on: i <= modelValue }"
      :aria-label="`打 ${i} 分`"
      :aria-pressed="i <= modelValue"
      :title="i === modelValue ? '再点一次擦掉' : `打 ${i} 分`"
      @click="mark(i)"
    >
      <svg viewBox="0 0 18 18" aria-hidden="true">
        <path :d="STARS[i - 1]" />
      </svg>
    </button>
  </span>
</template>

<style scoped>
.stars { display: inline-flex; gap: 2px; }
.star-mark {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; padding: 0; cursor: pointer;
  background: none; border: none; color: var(--rule);
  transition: transform 0.1s ease, color 0.12s ease;
}
.star-mark svg { width: 16px; height: 16px; }
.star-mark svg path { fill: none; stroke: currentColor; stroke-width: 1.5; }
.star-mark:hover { color: var(--ink-2); transform: scale(1.12); }
/* 打上的那一颗是红笔画的：填色略不满、角度略歪 */
.star-mark.on { color: var(--rec); transform: rotate(-7deg); }
.star-mark.on svg path { fill: var(--rec); fill-opacity: 0.85; stroke: var(--rec-ink); stroke-width: 1.2; }
.star-mark:nth-child(even).on { transform: rotate(5deg); }
</style>
