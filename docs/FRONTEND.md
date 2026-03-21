# 盼蕾平台 — 前端架构

> **本文件描述前端目录结构、组件层级、路由设计规范和 Pinia 状态管理约定。开发前端页面时查阅。**

---

## 目录结构

```
packages/frontend/src/
├── main.ts                    # 入口，注册插件
├── App.vue                    # 根组件
├── layouts/
│   ├── MainLayout.vue         # 母本主布局（顶部导航+侧边栏）
│   └── ModuleLayout.vue       # 专业模块布局（返回母本+模块导航）
├── views/
│   ├── auth/
│   │   └── LoginView.vue      # 登录页（账号/验证码/忘记密码）
│   ├── dashboard/
│   │   └── DashboardView.vue  # 首页/仪表盘（学生：实时待考/已完成数量+最近3条待考；卡片可点击跳转）
│   ├── users/
│   │   └── UsersView.vue      # 用户管理
│   ├── organizations/
│   │   └── OrganizationsView.vue
│   ├── questions/
│   │   └── QuestionsView.vue  # 题库管理
│   ├── papers/
│   │   └── PapersView.vue     # 试卷管理
│   ├── exams/
│   │   └── ExamsView.vue      # 考试管理（教师端）
│   ├── my-exams/
│   │   └── MyExamsView.vue    # 学生端：我的考试（待考/已考双Tab，截止倒计时，支持 ?tab=done 直接打开已考Tab）
│   ├── exam-room/
│   │   └── ExamRoomView.vue   # 答题界面（倒计时取 duration 和 endAt 较小值）
│   ├── scores/
│   │   └── ScoresView.vue     # 成绩管理
│   ├── score-tables/
│   │   ├── ScoreTablesView.vue
│   │   └── ScoreJudgeView.vue # 打分界面
│   ├── hardware/
│   │   └── HardwareDebugPanel.vue  # 硬件调试（仅 SUPER_ADMIN 可见/可访问）
│   ├── admin/
│   │   └── AdminView.vue      # 超管后台
│   └── modules/               # 专业模块页面（按 moduleCode 分目录）
│       └── {module-code}/
│           └── index.vue
├── stores/
│   ├── auth.ts                # 用户认证状态（token/user/modules）
│   └── {feature}.ts          # 其他 Pinia store
├── router/
│   └── index.ts              # 路由配置 + 权限守卫
├── api/
│   ├── request.ts            # axios 封装（自动附加 token）
│   └── {module}.ts           # 各模块接口函数（可选）
└── utils/
    └── {util}.ts
```

---

## 路由设计

### 路由结构
```typescript
[
  { path: '/login', component: LoginView, meta: { public: true } },
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', component: DashboardView },
      { path: 'users', component: UsersView, meta: { roles: ['TEACHER', 'SUPER_ADMIN'] } },
      { path: 'organizations', component: OrganizationsView },
      { path: 'questions', component: QuestionsView },
      { path: 'papers', component: PapersView },
      { path: 'exams', component: ExamsView },
      { path: 'my-exams', component: MyExamsView },          // ?tab=done 直接打开已考Tab
      { path: 'scores', component: ScoresView },
      { path: 'score-tables', component: ScoreTablesView },
      { path: 'admin', component: AdminView, meta: { roles: ['SUPER_ADMIN'] } },
      { path: 'hardware', component: HardwareDebugPanel, meta: { roles: ['SUPER_ADMIN'] } },
    ]
  },
  {
    path: '/exam/:id',
    component: ExamRoomView,
    meta: { noLayout: true }  // 全屏答题，无侧边栏
  },
  {
    path: '/modules/:moduleCode',
    component: ModuleLayout,
    children: [
      // 专业模块路由动态注册
    ],
    meta: { requiresModule: true }
  }
]
```

### 路由守卫逻辑
```typescript
router.beforeEach((to) => {
  const auth = useAuthStore()

  // 1. 未登录 → 跳登录页
  if (to.meta.requiresAuth !== false && !auth.isLoggedIn) return '/login'

  // 2. 已登录访问登录页 → 跳首页
  if (to.path === '/login' && auth.isLoggedIn) return '/'

  // 3. 角色权限检查（meta.roles 存在时）→ 无权限重定向首页
  const roles = to.meta.roles as string[] | undefined
  if (roles && auth.user && !roles.includes(auth.user.role)) return '/dashboard'
})
```

### 导航栏可见性规则（MainLayout.vue）

| 菜单项 | 可见角色 |
|--------|---------|
| 组织架构、用户管理、题库、试卷、考试管理、评分表 | TEACHER+ |
| 超管后台 | SUPER_ADMIN |
| 硬件调试 | SUPER_ADMIN |
| 我的考试、成绩查询 | 全角色可见 |

---

## Pinia 状态管理

### authStore（`stores/auth.ts`）
```typescript
// 状态
token: string | null
user: {
  id: string
  username: string
  realName: string
  role: 'SUPER_ADMIN' | 'TEACHER' | 'STUDENT'
  avatar?: string
  tenantId: string
  tenantName: string
} | null
modules: string[]  // 已购模块 code 列表

// Actions
login(credentials)  → 调用 /api/auth/login，存 token + user
setAuth(token, user) → 直接设置（验证码登录用）
logout()            → 清空 token，跳登录页
```

### 新建 Store 规范
```typescript
// stores/{feature}.ts
export const use{Feature}Store = defineStore('{feature}', {
  state: () => ({ ... }),
  getters: { ... },
  actions: { ... },
  persist: true  // 需要持久化时加
})
```

---

## 请求封装（`api/request.ts`）

```typescript
// 自动附加 token
instance.interceptors.request.use(config => {
  const auth = useAuthStore()
  if (auth.token) config.headers.Authorization = `Bearer ${auth.token}`
  return config
})

// 统一错误处理
instance.interceptors.response.use(
  res => res.data.data,          // 直接返回 data 字段
  err => {
    if (err.response?.status === 401) auth.logout()
    ElMessage.error(err.response?.data?.message || '请求失败')
    return Promise.reject(err)
  }
)
```

---

## 页面开发规范

### 页面文件头部注释
```vue
<!--
  文件：{path}
  说明：{一句话描述页面功能}
  权限：{SUPER_ADMIN | TEACHER | STUDENT | ALL}
  对应接口：{相关 API 路径}
-->
```

### 组件命名
- 页面级：`{Feature}View.vue`（如 `UsersView.vue`）
- 弹窗：`{Feature}Dialog.vue`
- 表单：`{Feature}Form.vue`
- 列表：`{Feature}List.vue`

### 布局惯例
- 列表页：`el-table` + 顶部 `el-input`/`el-select` 搜索栏 + 右上角操作按钮
- 表单：`el-form` + `el-dialog`（弹窗模式）
- 树形：`el-tree`（左侧）+ `el-table`（右侧）
