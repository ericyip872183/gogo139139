<!--
  文件：layouts/ModuleLayout.vue
  说明：专业模块独立布局，含「返回考试系统」导航和当前模块标题
  权限：ALL（模块权限由路由守卫校验）
-->
<template>
  <el-container class="module-layout">
    <el-header class="module-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" type="primary" plain size="small" @click="backToMain">
          返回考试系统
        </el-button>
        <el-divider direction="vertical" />
        <span class="module-name">{{ currentModule?.name ?? '专业模块' }}</span>
        <el-tag v-if="currentModule?.phase" size="small" type="warning" class="phase-tag">
          {{ currentModule.phase }}
        </el-tag>
      </div>
      <div class="header-right">
        <el-avatar :size="28" :src="user?.avatar ?? undefined">
          {{ user?.realName?.[0] }}
        </el-avatar>
        <span class="user-name">{{ user?.realName }}</span>
      </div>
    </el-header>

    <el-main class="module-content">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const user = computed(() => auth.user)
const currentModule = computed(() =>
  auth.modules.find(m => m.code === route.params.code),
)

function backToMain() {
  router.push('/dashboard')
}
</script>

<style scoped>
.module-layout { height: 100vh; }
.module-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 20px;
  background: #fff;
}
.header-left { display: flex; align-items: center; gap: 10px; }
.module-name { font-size: 16px; font-weight: 600; color: #303133; }
.phase-tag { margin-left: 2px; }
.header-right { display: flex; align-items: center; gap: 8px; }
.user-name { font-size: 13px; color: #606266; }
.module-content { background: #f5f7fa; }
</style>
