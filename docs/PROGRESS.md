# 盼蕾平台 — 功能进度追踪

> **本文件记录所有功能模块的完成状态。每完成一个功能立即更新（❌→✅）。如有计划外新增，在底部「计划外新增」章节记录。AI每次开发前必须读本文件。**

---

## 图例
- ✅ 已完成并部署
- 🔄 开发中
- ❌ 未开始
- ⏸ 暂缓（二期/三期）

---

## Sprint 1 — 工程搭建 + 认证

| 功能 | 状态 | 说明 |
|------|------|------|
| Monorepo 工程结构（pnpm workspace） | ✅ | packages/frontend、backend、hardware-bridge |
| Docker Compose 本地开发环境（MySQL+Redis） | ✅ | docker-compose.yml |
| NestJS 后端基础框架 | ✅ | main.ts、AppModule、全局前缀/api |
| Vue3 前端基础框架 | ✅ | Vite + Element Plus + Pinia + Vue Router |
| Prisma ORM + MySQL 连接 | ✅ | schema.prisma、PrismaService |
| JWT 认证（登录/Token验证） | ✅ | AuthModule、JwtStrategy |
| 账号密码登录 | ✅ | POST /api/auth/login |
| 验证码登录（手机/邮箱） | ✅ | POST /api/auth/login-by-code |
| 发送验证码 | ✅ | POST /api/auth/send-code（邮件+短信） |
| 忘记密码/重置密码 | ✅ | POST /api/auth/reset-password |
| 自动识别机构（按用户名/手机/邮箱） | ✅ | GET /api/auth/lookup-by-username、lookup-by-contact |
| 登录页前端（无需手动输入机构码） | ✅ | LoginView.vue，自动显示机构名 |
| MainLayout（主布局） | ✅ | 顶部导航 + 侧边栏 + 内容区 |
| 生产环境 Docker 部署 | ✅ | docker-compose.prod.yml、Dockerfile x2、nginx.conf |

---

## Sprint 2 — 用户与组织管理

| 功能 | 状态 | 说明 |
|------|------|------|
| 机构（Tenant）CRUD | ✅ | 超管后台管理 |
| 组织架构（4级树形）CRUD | ✅ | OrganizationsModule |
| 用户 CRUD（教师/学生） | ✅ | UsersModule |
| 批量导入用户（Excel） | ✅ | POST /api/users/import |
| 批量导出用户 | ✅ | GET /api/users/export |
| 用户所属多组织支持 | ✅ | UserOrg 关联表 |
| 前端：用户管理页 | ✅ | UsersView.vue |
| 前端：组织架构页 | ✅ | OrganizationsView.vue |

---

## Sprint 3 — 题库管理

| 功能 | 状态 | 说明 |
|------|------|------|
| 题目分类（树形）CRUD | ✅ | QuestionCategory |
| 题目 CRUD（单选/多选/判断/填空） | ✅ | QuestionsModule |
| 题目批量导入（Excel） | ✅ | 含选项和答案 |
| 题目搜索（关键词/分类/题型/难度） | ✅ | 分页查询 |
| 批量删除/移动分类 | ✅ | |
| 前端：题库管理页（左树右列表） | ✅ | QuestionsView.vue |

---

## Sprint 4 — 组卷与考试管理

| 功能 | 状态 | 说明 |
|------|------|------|
| 试卷 CRUD | ✅ | PapersModule |
| 组卷（从题库选题，覆盖分值） | ✅ | PaperQuestion |
| 考试 CRUD（关联试卷/时间/对象） | ✅ | ExamsModule |
| 考试状态管理（草稿/进行中/已结束） | ✅ | |
| 指定考生（用户/组织/角色） | ✅ | ExamParticipant |
| 前端：试卷管理页 | ✅ | PapersView.vue |
| 前端：考试管理页 | ✅ | ExamsView.vue |

---

## Sprint 5 — 在线考试答题

| 功能 | 状态 | 说明 |
|------|------|------|
| 学生待考考试列表 | ✅ | GET /api/exam-room/my-exams |
| 进入考试（创建 ExamSession） | ✅ | POST /api/exam-room/start |
| 答题实时保存 | ✅ | POST /api/exam-room/answer |
| 手动/自动交卷 | ✅ | POST /api/exam-room/submit |
| 防切屏记录 | ✅ | Page Visibility API |
| 断网续答（localStorage 缓存） | ✅ | |
| 前端：学生考试列表页 | ✅ | MyExamsView.vue |
| 前端：答题界面 | ✅ | ExamRoomView.vue |

---

## Sprint 6 — 自动阅卷与成绩

| 功能 | 状态 | 说明 |
|------|------|------|
| 自动阅卷引擎 | ✅ | 对比标准答案，计算得分 |
| Score 表写入 | ✅ | 总分/各题得分/正确率 |
| 教师端成绩查询 | ✅ | ScoresModule |
| 学生端成绩查看 | ✅ | 历史/答题明细 |
| 成绩导出（Excel） | ✅ | |
| 前端：成绩管理页 | ✅ | ScoresView.vue |

---

## Sprint 7 — 随时考核与评分表

| 功能 | 状态 | 说明 |
|------|------|------|
| 评分表 CRUD | ✅ | ScoreTablesModule |
| 评分项 CRUD（加/减分制） | ✅ | ScoreItem |
| 打分记录写入 | ✅ | ScoreRecord |
| 离线评分数据批量同步 | ✅ | |
| 前端：评分表管理页 | ✅ | ScoreTablesView.vue |
| 前端：打分界面 | ✅ | ScoreJudgeView.vue |

---

## Sprint 8 — SaaS 基础 + 模块框架

| 功能 | 状态 | 说明 |
|------|------|------|
| Module 表（模块定义） | ✅ | |
| TenantModule 授权表 | ✅ | 机构-模块-有效期-人数 |
| 超管后台：机构管理 | ✅ | AdminModule |
| 超管后台：模块授权配置 | ✅ | |
| 超管后台：平台统计 | ✅ | |
| ModuleLayout（独立模块布局） | ✅ | 双导航（返回母本+模块首页） |
| 动态模块入口（已购模块渲染） | ✅ | |
| 模块权限路由守卫 | ✅ | |
| 前端：超管后台页 | ✅ | AdminView.vue |

---

## Sprint 9 — 硬件通信标准模块

| 功能 | 状态 | 说明 |
|------|------|------|
| IHardwareDevice / IDataFrame 抽象接口 | ✅ | hardware-bridge/core |
| HardwareManager（连接池/重连/事件分发） | ✅ | |
| BluetoothDevice / BluetoothScanner | ✅ | Web Bluetooth |
| SerialDevice / SerialPortSelector | ✅ | Web Serial |
| FrameParser / FrameEncoder（协议解析） | ✅ | |
| HardwareDebugPanel.vue（调试面板） | ✅ | |
| DeviceSimulator（无硬件模拟器） | ✅ | |

---

## 二期功能（暂缓）

| 功能 | 状态 | 分期 |
|------|------|------|
| 微信/钉钉扫码登录 | ⏸ | 二期 |
| 登录限制（时间/IP） | ⏸ | 二期 |
| PBL 讨论小组 | ⏸ | 二期 |
| 跟师记录与病例管理 | ⏸ | 二期 |
| 学生交友与讨论小组 | ⏸ | 二期 |
| 综合资料与多媒体管理 | ⏸ | 二期 |
| 统一数据中心与统计分析（ECharts） | ⏸ | 二期 |
| 外部软件对接 | ⏸ | 二期 |
| 体质辨识教学模块 | ⏸ | 二期 |
| 耳穴教学模块（3D仿真） | ⏸ | 二期 |

---

## 三期功能（暂缓）

| 功能 | 状态 | 分期 |
|------|------|------|
| 经络采集分析模块 | ⏸ | 三期 |
| 中医四诊采集分析模块 | ⏸ | 三期 |
| 针刺手法采集模块 | ⏸ | 三期 |
| 刮痧手法采集模块 | ⏸ | 三期 |
| 推拿手法采集模块 | ⏸ | 三期 |
| 人体经络腧穴解剖模块 | ⏸ | 三期 |
| 远程升级系统 | ⏸ | 三期 |
| 实训硬件对接与操作评分 | ⏸ | 三期 |

---

## 计划外新增

| 功能 | 状态 | 新增原因 | 日期 |
|------|------|---------|------|
| Prisma binaryTargets Alpine 兼容配置 | ✅ | 生产部署时 Alpine Linux 需要 openssl-3.0.x 二进制 | 2026-03-19 |
| nginx resolver 127.0.0.11 动态DNS | ✅ | 解决容器启动时后端未就绪导致 nginx 崩溃 | 2026-03-19 |
| prisma db push 初始化（替代 migrate） | ✅ | 首次部署无 migrations 目录，用 db push 同步表结构 | 2026-03-19 |
| 8个专业模块预置+占位页 | ✅ | 超管授权界面改为选择预置模块而非手动新增；每个模块有独立介绍页 | 2026-03-19 |
| 顶部「专业模块▾」下拉菜单 | ✅ | 已购模块收纳在下拉菜单中，避免顶部过满 | 2026-03-19 |
| ModuleLayout + 模块路由 | ✅ | 专业模块独立布局（含「返回考试系统」），路由 /module/:code | 2026-03-19 |
| 6级角色权限体系（SUPER_ADMIN/TENANT_ADMIN/SCHOOL/CLASS/TEACHER/STUDENT） | ✅ | 替换原有3级体系；高级别可见低级别数据；同级隔离；角色分配只能向下；TENANT_ADMIN每机构唯一 | 2026-03-19 |
| nginx proxy_pass 尾斜杠 bug 修复 | ✅ | `proxy_pass http://backend:3000/` → `http://backend:3000`，去掉尾斜杠，否则 nginx 剥离 `/api` 前缀导致 404 | 2026-03-20 |
| GET /exams/my 响应扁平化 | ✅ | 原返回嵌套 ExamParticipant 结构，前端无法读取；改为扁平化返回 exam 字段 + hasSubmitted/switchCount/submittedAt | 2026-03-20 |
| MyExamsView 重构：待考/已考双 Tab + 倒计时 | ✅ | 原页面数据完全不显示（数据结构不匹配）；改为两个 Tab，待考显示截止实时倒计时（30分钟内变红），草稿考试对学生不可见 | 2026-03-20 |
| DashboardView 学生端实时统计 | ✅ | 原首页数字全写死 0；学生登录后加载真实待考/已完成数量，并显示最近3条待考快速入口 | 2026-03-20 |
| ExamRoomView 倒计时兼容 endAt | ✅ | 原倒计时只用 duration，不考虑 endAt；现取 duration 和 endAt 剩余时间的较小值 | 2026-03-20 |
| Dashboard 统计卡片可点击跳转 | ✅ | 待考考试→/my-exams；已完成→/my-exams?tab=done；我的成绩→/scores；学习资料暂不跳转 | 2026-03-20 |
| MyExamsView 支持 ?tab=done 参数 | ✅ | 从 Dashboard"已完成"卡片跳入时自动激活已考 Tab | 2026-03-20 |
| 硬件调试页仅 SUPER_ADMIN 可见 | ✅ | MainLayout 导航项加 v-if="isSuperAdmin"；路由加 meta.roles=['SUPER_ADMIN'] 守卫，非超管强制重定向首页 | 2026-03-20 |
| 超管首页重构：平台业务数据展示 | ✅ | 原首页显示学生考试数据，不符合超管身份；新增机构统计、模块销售、用户分布、到期预警、最近动态 | 2026-03-22 |
| 个人中心（我）页面 | ✅ | 所有角色共用个人中心，含基本信息、修改密码、账户安全、角色专属数据 | 2026-03-22 |
| 后端 /admin/dashboard/stats 接口 | ✅ | 提供超管首页统计数据：机构/用户/模块销售/到期预警/最近动态 | 2026-03-22 |
| 后端 /users/me、/users/me/password 接口 | ✅ | 获取当前用户信息、修改密码 | 2026-03-22 |
| 超管后台 - 机构成员管理 | ✅ | 新增机构成员 CRUD、批量删除、重置密码、角色修改、操作日志记录 | 2026-03-24 |
| 超管后台 - 全库用户管理 | ✅ | 跨机构查看/编辑/删除所有用户，支持按机构/角色筛选，按手机/邮箱搜索 | 2026-03-24 |
| 机构管理员/学校管理员导航菜单 | ✅ | 在 MainLayout 中为机构管理员和学校管理员显示「组织架构」和「用户管理」菜单 | 2026-03-24 |

---

## 进度总览

| 阶段 | 完成 | 总计 | 进度 |
|------|------|------|------|
| Sprint 1-9（一期） | 63 | 63 | 100% ✅ |
| 二期功能 | 0 | 10 | 0% |
| 三期功能 | 0 | 8 | 0% |
