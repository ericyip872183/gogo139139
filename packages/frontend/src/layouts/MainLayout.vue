<template>
  <el-container class="main-layout">
    <!-- 顶部导航栏 -->
    <el-header class="main-header">
      <div class="header-left">
        <span class="logo">若容虚拟数据平台</span>
        <el-menu
          mode="horizontal"
          :ellipsis="false"
          :default-active="activeMenu"
          router
          class="main-nav"
        >
          <el-menu-item index="/dashboard">首页</el-menu-item>
          <el-menu-item v-if="isTeacherOrAdmin" index="/organizations">组织架构</el-menu-item>
          <el-menu-item v-if="isTeacherOrAdmin" index="/users">用户管理</el-menu-item>
          <el-menu-item v-if="isTeacherOrAdmin" index="/questions">题库管理</el-menu-item>
          <el-menu-item v-if="isTeacherOrAdmin" index="/papers">试卷管理</el-menu-item>
          <el-menu-item v-if="isTeacherOrAdmin" index="/exams">考试管理</el-menu-item>
          <el-menu-item index="/my-exams">我的考试</el-menu-item>
          <el-menu-item index="/scores">成绩查询</el-menu-item>
          <el-menu-item v-if="isTeacherOrAdmin" index="/score-tables">评分表</el-menu-item>
          <el-menu-item v-if="isSuperAdmin" index="/admin">超管后台</el-menu-item>
          <el-menu-item v-if="isSuperAdmin" index="/hardware">硬件调试</el-menu-item>
        </el-menu>
      </div>

      <div class="header-right">
        <!-- 已购模块入口（Sprint 8 后动态渲染） -->
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
    </el-header>

    <!-- 主内容区 -->
    <el-main class="main-content">
      <router-view />
    </el-main>
  </el-container>
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
const isTeacherOrAdmin = computed(() => auth.isTeacher)
const isSuperAdmin = computed(() => auth.isSuperAdmin)
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
  }
}
</script>

<style scoped>
.main-layout { height: 100vh; }
.main-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 20px;
  background: #fff;
}
.header-left { display: flex; align-items: center; gap: 20px; }
.logo { font-size: 18px; font-weight: 600; color: #409eff; white-space: nowrap; }
.main-nav { border-bottom: none; }
.header-right { display: flex; align-items: center; gap: 12px; }
.module-switch { cursor: pointer; }
.user-info { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.user-name { font-size: 14px; color: #303133; }
.main-content { background: #f5f7fa; }
</style>
