<template>
  <div class="app-layout">
    <!-- 顶部导航栏 -->
    <header class="app-header">
      <div class="header-left">
        <span class="logo">盼蕾中医/医学教学平台</span>
        <el-menu
          mode="horizontal"
          :ellipsis="false"
          :default-active="activeMenu"
          router
          class="main-nav"
        >
          <el-menu-item index="/dashboard">首页</el-menu-item>
          <!-- 机构管理员：显示全部管理菜单 -->
          <template v-if="isTenantAdmin">
            <el-menu-item index="/organizations">组织架构</el-menu-item>
            <el-menu-item index="/users">用户管理</el-menu-item>
            <el-menu-item index="/questions">题库管理</el-menu-item>
            <el-menu-item index="/papers">试卷管理</el-menu-item>
            <el-menu-item index="/exams">考试管理</el-menu-item>
            <el-menu-item index="/score-tables">评分表</el-menu-item>
            <el-menu-item index="/ai-settings">AI 大模型</el-menu-item>
          </template>
          <!-- 教师：显示教学相关菜单 -->
          <template v-else-if="isTeacher">
            <el-menu-item index="/questions">题库管理</el-menu-item>
            <el-menu-item index="/papers">试卷管理</el-menu-item>
            <el-menu-item index="/exams">考试管理</el-menu-item>
            <el-menu-item index="/scores">成绩查询</el-menu-item>
            <el-menu-item index="/score-tables">评分表</el-menu-item>
          </template>
          <!-- 学生：只显示学习和成绩 -->
          <template v-else-if="isStudent">
            <el-menu-item index="/my-exams">我的考试</el-menu-item>
            <el-menu-item index="/scores">成绩查询</el-menu-item>
          </template>
          <!-- 超级管理员：只显示超管后台 -->
          <template v-else-if="isSuperAdmin">
            <el-menu-item index="/admin">超管后台</el-menu-item>
          </template>
        </el-menu>
      </div>

      <div class="header-right">
        <!-- 已购模块入口 -->
        <el-dropdown
          v-if="purchasedModules.length > 0"
          class="module-switch"
          trigger="click"
        >
          <el-button type="primary" plain size="small">
            专业模块 <el-icon><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="mod in purchasedModules"
                :key="mod.code"
                @click="$router.push(`/module/${mod.code}`)"
              >
                {{ mod.name }}
                <el-tag v-if="mod.phase" size="small" type="warning" style="margin-left:6px">{{ mod.phase }}</el-tag>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <!-- 用户信息 -->
        <el-dropdown @command="handleUserCommand">
          <span class="user-info">
            <el-avatar :size="32" :src="user?.avatar ?? undefined">
              {{ user?.realName?.[0] }}
            </el-avatar>
            <span class="user-name">{{ user?.realName }}</span>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">个人信息</el-dropdown-item>
              <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const user = computed(() => auth.user)
const isSuperAdmin = computed(() => auth.user?.role === 'SUPER_ADMIN')
const isTenantAdmin = computed(() => auth.user?.role === 'TENANT_ADMIN')
const isTeacher = computed(() => ['TEACHER', 'SCHOOL', 'CLASS'].includes(auth.user?.role || ''))
const isStudent = computed(() => auth.user?.role === 'STUDENT')
const activeMenu = computed(() => '/' + route.path.split('/')[1])
const purchasedModules = computed(() => auth.modules)

onMounted(() => {
  if (auth.isLoggedIn) auth.loadMyModules()
})

function handleUserCommand(command: string) {
  if (command === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' })
      .then(() => {
        auth.logout()
        router.push('/login')
      })
      .catch(() => {})
  } else if (command === 'profile') {
    router.push('/profile')
  }
}
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 20px;
  background: #fff;
  flex-shrink: 0;
  height: 60px;
  z-index: 100;
}

.header-left { display: flex; align-items: center; gap: 20px; }
.logo { font-size: 18px; font-weight: 600; color: #409eff; white-space: nowrap; }
.main-nav { border-bottom: none; }
.header-right { display: flex; align-items: center; gap: 12px; }
.module-switch { cursor: pointer; }
.user-info { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.user-name { font-size: 14px; color: #303133; }

.app-main {
  flex: 1;
  overflow-y: auto;
  background: #f5f7fa;
  padding: 20px;
}
</style>
