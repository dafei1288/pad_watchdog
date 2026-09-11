<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: { type: Number, default: 0 }, // 0 = 未评分
  size: { type: String, default: '28px' },
  label: { type: String, default: '评分' },
})
const emit = defineEmits(['update:modelValue'])
const hover = ref(0)

// 实心/空心两套字形：状态差异不只靠颜色（★ 与 ☆ 形状不同）
function glyphFor(i) {
  return i <= (hover.value || props.modelValue) ? '★' : '☆'
}

function pick(i) {
  emit('update:modelValue', i === props.modelValue ? 0 : i)
}
</script>

<template>
  <span class="stars" role="group" :aria-label="label" @mouseleave="hover = 0">
    <button
      v-for="i in 5"
      :key="i"
      type="button"
      class="star"
      :class="{ on: i <= (hover || modelValue) }"
      :style="{ fontSize: size }"
      :aria-label="`${i} 星`"
      :aria-pressed="i <= modelValue"
      :title="i === modelValue ? '再次点击清除评分' : `打 ${i} 星`"
      @mouseover="hover = i"
      @focus="hover = i"
      @blur="hover = 0"
      @click="pick(i)"
    >{{ glyphFor(i) }}</button>
  </span>
</template>

<style scoped>
.stars { display: inline-flex; gap: 2px; user-select: none; }
.star {
  display: inline-flex; align-items: center; justify-content: center;
  width: 1em; min-width: 24px; min-height: 26px; height: 1.15em; padding: 0;
  border: none; background: none;
  border-radius: 6px; color: var(--ink-2); cursor: pointer; line-height: 1;
  transition: color 0.15s, transform 0.15s;
}
.star.on { color: var(--star); }
.star:hover { transform: scale(1.12); }
</style>
