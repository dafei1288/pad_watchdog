<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, setToken } from '../api'

const router = useRouter()
const password = ref('')
const error = ref('')
const busy = ref(false)

async function onLogin() {
  if (!password.value) return
  busy.value = true
  error.value = ''
  try {
    const { token } = await api.login(password.value)
    setToken(token)
    router.replace('/settings')
  } catch (e) {
    error.value = e.status === 401 ? '密码不对' : e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="back-cover">
    <div class="block">
      <h2>拧开后盖</h2>
      <p class="tiny muted">设置和孩子资料都装在后盖底下，拧开才改得动。</p>
      <label class="field">
        <span class="tiny muted">管理密码</span>
        <input
          v-model="password"
          class="blank"
          type="password"
          aria-label="管理密码"
          placeholder="输入密码"
          autocomplete="current-password"
          @keyup.enter="onLogin"
        />
      </label>
      <p v-if="error" class="danger" role="alert">{{ error }}</p>
      <button class="btn" :disabled="busy" @click="onLogin">拧开</button>
    </div>
  </section>
</template>

<style scoped>
.back-cover { max-width: 340px; margin: var(--s4) auto; }
.back-cover .block { margin-bottom: 0; }
.back-cover p { margin: 0 0 var(--s2); }
.field { display: grid; gap: 4px; margin: var(--s3) 0 0; }
.field .blank { width: 100%; box-sizing: border-box; letter-spacing: 0.16em; }
.back-cover .danger { margin: var(--s2) 0 0; font-size: var(--t-note); }
.back-cover .btn { width: 100%; margin-top: var(--s3); }
</style>
