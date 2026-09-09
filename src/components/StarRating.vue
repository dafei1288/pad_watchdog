<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: { type: Number, default: 0 }, // 0 = 未评分
  size: { type: String, default: '28px' },
})
const emit = defineEmits(['update:modelValue'])
const hover = ref(0)
</script>

<template>
  <span class="stars" @mouseleave="hover = 0">
    <span
      v-for="i in 5"
      :key="i"
      class="star"
      :class="{ on: i <= (hover || modelValue) }"
      :style="{ fontSize: size }"
      @mouseover="hover = i"
      @click="emit('update:modelValue', i === modelValue ? 0 : i)"
    >★</span>
  </span>
</template>

<style scoped>
.stars { display: inline-flex; gap: 2px; user-select: none; }
.star { color: #e0e0e0; cursor: pointer; transition: color 0.15s, transform 0.15s; line-height: 1; }
.star.on { color: #f7b500; }
.star:hover { transform: scale(1.15); }
</style>
