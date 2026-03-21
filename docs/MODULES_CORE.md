# 盼蕾平台 — 母本核心系统模块详解

> **本文件详细描述母本16个核心功能模块的子模块拆分、后端 NestJS 模块对应、前端页面对应及与主框架的对接方式。开发核心功能时查阅。**

---

## 模块总览

| # | 模块名称 | 后端模块 | 前端页面 | 状态 | 分期 |
|---|---------|---------|---------|------|------|
| 1 | 账号登录与安全验证 | AuthModule | LoginView | ✅ | 一期 |
| 2 | 人员组织与用户管理 | UsersModule + OrganizationsModule | UsersView + OrgsView | ✅ | 一期 |
| 3 | 试题库管理 | QuestionsModule | QuestionsView | ✅ | 一期 |
| 4 | 试卷发布与考试管理 | PapersModule + ExamsModule | PapersView + ExamsView | ✅ | 一期 |
| 5 | 在线考试答题 | ExamRoomModule | ExamRoomView + MyExamsView | ✅ | 一期 |
| 6 | 自动阅卷与成绩查询 | ScoresModule | ScoresView | ✅ | 一期 |
| 7 | 随时考核与多维度评分 | ScoreTablesModule | ScoreTablesView + ScoreJudgeView | ✅ | 一期 |
| 8 | SaaS 模块化授权与双界面切换 | AdminModule | AdminView | ✅ | 一期 |
| 9 | PBL 讨论小组与临床思维 | PblModule（待建） | PblView（待建） | ⏸ | 二期 |
| 10 | 跟师记录与病例管理 | CaseModule（待建） | CaseView（待建） | ⏸ | 二期 |
| 11 | 学生交友与讨论小组 | SocialModule（待建） | SocialView（待建） | ⏸ | 二期 |
| 12 | 综合资料与多媒体管理 | MediaModule（待建） | MediaView（待建） | ⏸ | 二期 |
| 13 | 实训硬件对接与操作评分 | HardwareModule（待建） | HardwareView（待建） | ⏸ | 三期 |
| 14 | 统一数据中心与统计分析 | StatsModule（待建） | StatsView（待建） | ⏸ | 二期 |
| 15 | 外部软件对接 | IntegrationModule（待建） | - | ⏸ | 二期 |
| 16 | 远程升级 | UpgradeModule（待建） | - | ⏸ | 三期 |

---

## 模块 1：账号登录与安全验证

### 子模块
- `AuthController`：登录/注册/找回密码路由
- `AuthService`：业务逻辑（bcrypt 对比、JWT 签发）
- `CodeService`：验证码生成/发送/校验（Redis 存储）
- `JwtStrategy`：Passport JWT 守卫
- `CurrentUser` 装饰器：从 JWT 提取 userId

### 前端组件
- `LoginView.vue`：账号密码 + 验证码 + 忘记密码（三合一）
- `useAuthStore`：Pinia，存储 token + user 信息

### 与主框架对接
- JWT Token 格式：`{ sub: userId, tenantId, role }`
- 所有受保护接口使用 `@UseGuards(AuthGuard('jwt'))`
- 前端 `request.ts` 拦截器自动附加 `Authorization: Bearer {token}`

---

## 模块 2：人员组织与用户管理

### 子模块
- `OrganizationsModule`：4级树形组织 CRUD
- `UsersModule`：用户 CRUD + 批量导入/导出

### 数据表
- `organizations`：id、tenantId、name、parentId、level、code
- `users`：id、tenantId、username、password、role、phone、email...
- `user_orgs`：userId ↔ organizationId（多对多）

### 关键业务规则
- 同一机构内 username 唯一（跨机构可重复）
- 批量导入通过 Excel 模板，字段：姓名/用户名/密码/手机/邮箱/组织
- 教师可属于多个组织，权限按组织隔离

---

## 模块 3：试题库管理

### 子模块
- `QuestionCategoriesService`：分类树 CRUD
- `QuestionsService`：题目 CRUD + 搜索 + 批量操作

### 数据表
- `question_categories`：id、tenantId、name、parentId、moduleCode
- `questions`：id、tenantId、categoryId、type、content、difficulty
- `question_options`：questionId、label、content、isCorrect

### 题型枚举
```typescript
enum QuestionType { SINGLE = 'SINGLE', MULTI = 'MULTI', JUDGE = 'JUDGE', FILL = 'FILL' }
```

---

## 模块 4：试卷发布与考试管理

### 子模块
- `PapersService`：试卷 CRUD + 组卷
- `ExamsService`：考试 CRUD + 指定对象 + 状态管理

### 数据表
- `papers`：id、tenantId、title、totalScore、duration
- `paper_questions`：paperId、questionId、order、score
- `exams`：id、tenantId、paperId、startAt、endAt、status
- `exam_participants`：examId、userId（指定考生）

### 考试状态机
```
DRAFT → ACTIVE（发布） → ENDED（结束/手动关闭）
```

---

## 模块 5：在线考试答题

### 子模块
- `ExamRoomService`：进入考试、答题保存、交卷、防切屏

### 数据表
- `exam_answers`：sessionId、questionId、answer、isCorrect、score

### 断网续答机制
- 前端每次答题同时写 `localStorage`
- 网络恢复后与服务端合并（以服务端为准）

---

## 模块 6：自动阅卷与成绩

### 子模块
- 阅卷引擎（内嵌于 ExamRoomService.submit）
- `ScoresService`：成绩查询/统计/导出

### 数据表
- `scores`：examId、userId、totalScore、correctRate、rank

---

## 模块 7：随时考核与评分表

### 子模块
- `ScoreTablesService`：评分表 + 评分项 CRUD
- 打分逻辑：记录每项得分，合计

### 数据表
- `score_tables`：id、tenantId、name、type（ADD/MINUS）
- `score_items`：tableId、name、score、order
- `score_records`：tableId、judgeId、targetUserId、scores（JSON）、total

---

## 模块 8：SaaS 授权与模块框架

### 子模块
- `AdminService`：机构管理 + 模块授权 + 平台统计
- 前端 `ModuleLayout.vue`：独立模块布局

### 数据表
- `modules`：id、code、name、description
- `tenant_modules`：tenantId、moduleId、expiredAt、maxUsers

### 模块切换流程
```
登录 → 加载用户已购模块列表 → 存入 authStore.modules
→ 点击模块入口 → 路由跳转到 ModuleLayout
→ ModuleLayout 顶部显示「返回母本」+ 模块名
```

---

## 新增模块开发模板

开发新的核心模块时，按以下步骤：

```
1. 后端：packages/backend/src/modules/{module-name}/
   ├── {module}.module.ts
   ├── {module}.controller.ts
   ├── {module}.service.ts
   └── dto/{module}.dto.ts

2. 在 AppModule 中注册新 Module

3. 在 schema.prisma 中添加新数据表，运行 prisma db push

4. 前端：packages/frontend/src/views/{module-name}/
   └── {Module}View.vue

5. 在 router/index.ts 中注册路由

6. 更新 PROGRESS.md 和本文件的模块总览表
```
