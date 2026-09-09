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
    error.value = e.status === 401 ? '密码错误' : e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="login-wrap">
    <section class="card login-card">
      <h2>家长验证</h2>
      <p class="hint">进入配置页面前请输入密码</p>
      <input
        v-model="password"
        type="password"
        placeholder="密码"
        autocomplete="current-password"
        @keyup.enter="onLogin"
      />
      <p v-if="error" class="danger">{{ error }}</p>
      <button class="primary" :disabled="busy" @click="onLogin">登录</button>
    </section>
  </div>
</template>

<style scoped>
.login-wrap { display: flex; justify-content: center; padding-top: 60px; }
.login-card { width: 300px; display: flex; flex-direction: column; gap: 12px; text-align: center; }
.hint { color: var(--ink-2); font-size: 13px; margin: 0; }
</style>
