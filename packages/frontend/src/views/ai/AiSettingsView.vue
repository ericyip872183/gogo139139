<template>
  <div class="ai-settings-redirect">
    <el-card v-loading="loading">
      <template #header>
        <span>AI 服务中心</span>
      </template>
      <div class="redirect-content">
        <p>正在为您跳转...</p>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const loading = true

onMounted(() => {
  const role = auth.user?.role

  if (role === 'SUPER_ADMIN') {
    // 超管跳转到平台管理
    setTimeout(() => {
      router.push('/ai-platform')
    }, 500)
  } else if (role === 'TENANT_ADMIN') {
    // 机构管理员跳转到服务中心
    setTimeout(() => {
      router.push('/ai-service')
    }, 500)
  } else {
    // 其他角色返回首页
    setTimeout(() => {
      router.push('/dashboard')
    }, 500)
  }
})
</script>

<style scoped>
.ai-settings-redirect {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}
.redirect-content {
  text-align: center;
}
</style>
