import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ── 公开页面 ──────────────────────────────────────
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { requiresAuth: false },
    },

    // ── 母本系统（默认主界面）────────────────────────
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      meta: { requiresAuth: true },
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import('@/views/dashboard/DashboardView.vue'),
          meta: { title: '首页' },
        },
        // Sprint 2：用户与组织管理
        {
          path: 'organizations',
          name: 'Organizations',
          component: () => import('@/views/organization/OrganizationView.vue'),
          meta: { title: '组织架构' },
        },
        {
          path: 'users',
          name: 'Users',
          component: () => import('@/views/users/UsersView.vue'),
          meta: { title: '用户管理' },
        },
        // Sprint 3：题库管理
        {
          path: 'questions',
          name: 'Questions',
          component: () => import('@/views/questions/QuestionsView.vue'),
          meta: { title: '题库管理' },
        },
        // Sprint 4：试卷与考试管理
        {
          path: 'papers',
          name: 'Papers',
          component: () => import('@/views/exams/PapersView.vue'),
          meta: { title: '试卷管理' },
        },
        {
          path: 'exams',
          name: 'Exams',
          component: () => import('@/views/exams/ExamsView.vue'),
          meta: { title: '考试管理' },
        },
        // Sprint 5：在线考试
        {
          path: 'exam/:id',
          name: 'ExamRoom',
          component: () => import('@/views/exam-room/ExamRoomView.vue'),
          meta: { title: '在线考试', hideNav: true },
        },
        // Sprint 6：成绩查询
        {
          path: 'scores',
          name: 'Scores',
          component: () => import('@/views/scores/ScoresView.vue'),
          meta: { title: '成绩查询' },
        },
        // Sprint 7：评分表管理
        {
          path: 'score-tables',
          name: 'ScoreTables',
          component: () => import('@/views/score-tables/ScoreTablesView.vue'),
          meta: { title: '评分表' },
        },
        {
          path: 'score-tables/:id/judge',
          name: 'ScoreJudge',
          component: () => import('@/views/score-tables/ScoreJudgeView.vue'),
          meta: { title: '打分', hideNav: true },
        },
        // Sprint 8：超管后台
        {
          path: 'admin',
          name: 'Admin',
          component: () => import('@/views/admin/AdminView.vue'),
          meta: { title: '超管后台' },
        },
        // Sprint 9：硬件调试（仅超级管理员）
        {
          path: 'hardware',
          name: 'Hardware',
          component: () => import('@/views/hardware/HardwareDebugPanel.vue'),
          meta: { title: '硬件调试', roles: ['SUPER_ADMIN'] },
        },
        // 学生端 - 我的考试
        {
          path: 'my-exams',
          name: 'MyExams',
          component: () => import('@/views/my-exams/MyExamsView.vue'),
          meta: { title: '我的考试' },
        },
        // 个人中心（所有角色）
        {
          path: 'profile',
          name: 'Profile',
          component: () => import('@/views/profile/ProfileView.vue'),
          meta: { title: '个人中心' },
        },
      ],
    },

    // ── 专业模块独立界面 ─────────────────────────────
    {
      path: '/module/:code',
      component: () => import('@/layouts/ModuleLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'ModulePage',
          component: () => import('@/views/modules/ModulePlaceholder.vue'),
        },
      ],
    },

    // ── 404 ──────────────────────────────────────────
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

// 路由守卫
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth !== false && !auth.isLoggedIn) {
    return '/login'
  }
  if (to.path === '/login' && auth.isLoggedIn) {
    return '/'
  }
  // 角色权限拦截
  const roles = to.meta.roles as string[] | undefined
  if (roles && auth.user && !roles.includes(auth.user.role)) {
    return '/dashboard'
  }
})

export default router
