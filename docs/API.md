# 盼蕾平台 — 后端接口规范

> **本文件记录所有后端 API 接口的路径、方法、认证要求、请求/响应格式。前后端对接时查阅。新增接口必须在此登记。**

---

## 基础规范

- **Base URL**：`http://{host}/api`
- **认证**：除登录/查找机构接口外，所有接口需携带 `Authorization: Bearer {token}`
- **Content-Type**：`application/json`
- **统一响应格式**：
```json
{ "code": 200, "message": "success", "data": {}, "timestamp": "..." }
```
- **分页参数**：`?page=1&pageSize=20`
- **分页响应 data**：`{ "total": 100, "list": [], "page": 1, "pageSize": 20 }`

---

## 认证模块 `/api/auth`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/auth/login` | ❌ | 账号密码登录 |
| POST | `/auth/login-by-code` | ❌ | 验证码登录 |
| POST | `/auth/send-code` | ❌ | 发送验证码 |
| POST | `/auth/reset-password` | ❌ | 重置密码 |
| GET | `/auth/lookup-by-username` | ❌ | 按用户名查机构列表 |
| GET | `/auth/lookup-by-contact` | ❌ | 按手机/邮箱查机构列表 |
| GET | `/auth/profile` | ✅ | 获取当前用户信息 |
| GET | `/auth/my-modules` | ✅ | 获取本机构已购模块列表 |

### POST /auth/login
```json
// 请求
{ "username": "admin", "password": "admin123", "tenantCode": "PLATFORM" }
// 响应 data
{ "token": "eyJ...", "user": { "id": "...", "username": "admin", "role": "SUPER_ADMIN", "tenantId": "...", "tenantName": "盼蕾平台" } }
```

### POST /auth/send-code
```json
// 请求
{ "tenantCode": "PLATFORM", "contact": "13800138000", "purpose": "login" }
// purpose: "login" | "reset"
```

### GET /auth/lookup-by-username?username=admin
```json
// 响应 data（数组）
[{ "name": "盼蕾平台", "code": "PLATFORM" }]
```

### GET /auth/my-modules
```json
// 响应 data（数组，仅返回本机构已授权的模块）
[{ "code": "TCM_CONSTITUTION", "name": "体质辨识教学", "phase": "二期" }]
```

---

| 方法 | 路径 | 角色 | 说明 |
|------|------|------|------|
| GET | `/users` | TEACHER+ | 用户列表（分页+筛选） |
| POST | `/users` | TEACHER+ | 新增用户 |
| PATCH | `/users/:id` | TEACHER+ | 编辑用户 |
| DELETE | `/users/:id` | TEACHER+ | 删除用户 |
| POST | `/users/import` | TEACHER+ | 批量导入（Excel） |
| GET | `/users/export` | TEACHER+ | 批量导出（Excel） |
| POST | `/users/batch-delete` | TEACHER+ | 批量删除 |

---

## 组织架构 `/api/organizations`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/organizations/tree` | 获取树形组织架构 |
| POST | `/organizations` | 新增节点 |
| PATCH | `/organizations/:id` | 编辑节点 |
| DELETE | `/organizations/:id` | 删除节点 |

---

## 题库 `/api/questions`

### 题目分类

| 方法 | 路径 | 角色 | 说明 |
|------|------|------|------|
| GET | `/questions/categories/tree` | TEACHER+ | 获取分类树 |
| GET | `/questions/categories/list` | TEACHER+ | 获取分类列表（平铺） |
| POST | `/questions/categories` | TEACHER+ | 新增分类 |
| PATCH | `/questions/categories/:id` | TEACHER+ | 编辑分类 |
| DELETE | `/questions/categories/:id` | TEACHER+ | 删除分类 |

### 题目管理

| 方法 | 路径 | 角色 | 说明 |
|------|------|------|------|
| GET | `/questions` | TEACHER+ | 题目列表（分页+搜索） |
| GET | `/questions/:id` | TEACHER+ | 题目详情（含媒体资源） |
| POST | `/questions` | TEACHER+ | 新增题目（支持富文本 + 媒体） |
| PATCH | `/questions/:id` | TEACHER+ | 编辑题目（支持媒体更新） |
| DELETE | `/questions/:id` | TEACHER+ | 删除题目（软删除） |
| DELETE | `/questions/batch` | TEACHER+ | 批量删除题目 |
| POST | `/questions/import` | TEACHER+ | 批量导入（JSON） |
| POST | `/questions/import-excel` | TEACHER+ | 批量导入（Excel） |
| GET | `/questions/export` | TEACHER+ | 批量导出（Excel） |

### 题目媒体资源

| 方法 | 路径 | 角色 | 说明 |
|------|------|------|------|
| POST | `/questions/:id/media` | TEACHER+ | 上传题目媒体文件（图片/视频/音频） |
| GET | `/questions/media/:id` | TEACHER+ | 获取媒体资源详情 |
| DELETE | `/questions/media/:id` | TEACHER+ | 删除媒体资源 |

### 题目数据结构

```json
{
  "id": "...",
  "type": "SINGLE",  // SINGLE | MULTIPLE | JUDGE | FILL
  "content": "<p>富文本内容，支持 HTML 标签</p>",
  "difficulty": "MEDIUM",  // EASY | MEDIUM | HARD
  "score": 2,
  "explanation": "题目解析",
  "categoryId": "...",
  "category": { "id": "...", "name": "分类名" },
  "options": [
    { "label": "A", "content": "选项内容", "isCorrect": true, "sortOrder": 0 }
  ],
  "mediaItems": [
    {
      "id": "...",
      "type": "image",  // image | video | audio | file
      "url": "/uploads/questions/{tenantId}/{filename}",
      "caption": "说明文字",
      "sortOrder": 0,
      "fileSize": 102400,
      "duration": 0
    }
  ],
  "isActive": true,
  "createdAt": "2026-03-25T10:00:00.000Z"
}
```

### POST /questions 请求示例

```json
{
  "type": "SINGLE",
  "content": "<p>以下哪项属于八纲辨证？</p><p><img src=\"data:image/png;base64,...\"/></p>",
  "difficulty": "MEDIUM",
  "score": 2,
  "categoryId": "...",
  "explanation": "八纲包括阴阳表里寒热虚实",
  "options": [
    { "label": "A", "content": "阴阳表里", "isCorrect": true },
    { "label": "B", "content": "气血津液", "isCorrect": false },
    { "label": "C", "content": "五行生克", "isCorrect": false },
    { "label": "D", "content": "脏腑经络", "isCorrect": false }
  ],
  "mediaItems": [
    {
      "type": "image",
      "url": "/uploads/questions/xxx/xxx.png",
      "caption": "题目配图",
      "sortOrder": 0
    }
  ]
}
```

---

## 试卷 `/api/papers`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/papers` | 试卷列表 |
| POST | `/papers` | 新增试卷 |
| PATCH | `/papers/:id` | 编辑试卷 |
| DELETE | `/papers/:id` | 删除试卷 |
| GET | `/papers/:id/questions` | 获取试卷题目 |
| POST | `/papers/:id/questions` | 添加题目到试卷 |
| DELETE | `/papers/:id/questions/:qid` | 从试卷移除题目 |

---

## 考试 `/api/exams`

| 方法 | 路径 | 角色 | 说明 |
|------|------|------|------|
| GET | `/exams` | TEACHER+ | 考试列表（分页+筛选） |
| POST | `/exams` | TEACHER+ | 新建考试 |
| PATCH | `/exams/:id` | TEACHER+ | 编辑考试 |
| POST | `/exams/:id/publish` | TEACHER+ | 发布考试（草稿→已发布） |
| POST | `/exams/:id/cancel` | TEACHER+ | 取消考试 |
| GET | `/exams/:id` | TEACHER+ | 考试详情 |
| GET | `/exams/:id/participants` | TEACHER+ | 考生列表 |
| POST | `/exams/:id/participants` | TEACHER+ | 批量分配考生 |
| DELETE | `/exams/:id/participants/:userId` | TEACHER+ | 移除考生 |
| GET | `/exams/my` | STUDENT | 学生端：我的考试列表 |

### GET /exams/my — 响应格式
```json
// 响应 data（数组，每项为扁平化结构）
[{
  "id": "exam_id",
  "title": "期末考试",
  "status": "PUBLISHED",
  "startAt": "2026-03-20T09:00:00Z",
  "endAt": "2026-03-20T11:00:00Z",
  "duration": 120,
  "maxSwitch": 3,
  "paper": { "title": "试卷名称", "totalScore": 100, "duration": 120 },
  "hasSubmitted": false,
  "switchCount": 0,
  "submittedAt": null
}]
// 注意：草稿状态（DRAFT）的考试不在学生可见范围，前端过滤展示
```

---

## 考试室 `/api/exam-room`

| 方法 | 路径 | 角色 | 说明 |
|------|------|------|------|
| GET | `/exam-room/:examId` | STUDENT | 进入考试（返回题目，不含答案） |
| POST | `/exam-room/:examId/answer` | STUDENT | 保存单题答案（实时） |
| POST | `/exam-room/:examId/switch` | STUDENT | 记录切屏（超限自动交卷） |
| POST | `/exam-room/:examId/submit` | STUDENT | 手动交卷（触发自动阅卷） |

### GET /exam-room/:examId — 响应格式
```json
{
  "examId": "...",
  "title": "期末考试",
  "duration": 120,
  "startAt": "...",
  "endAt": "...",
  "maxSwitch": 3,
  "switchCount": 0,
  "totalScore": 100,
  "questions": [{
    "id": "q1",
    "type": "SINGLE",
    "content": "题目内容",
    "paperScore": 5,
    "savedAnswer": null,
    "options": [{ "id": "o1", "label": "A", "content": "选项内容" }]
  }]
}
```

---

## 成绩 `/api/scores`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/scores` | 成绩列表（教师端） |
| GET | `/scores/my` | 我的成绩（学生端） |
| GET | `/scores/:id/detail` | 成绩详情（答题明细） |
| GET | `/scores/export` | 导出 Excel |
| POST | `/scores` | 写入成绩（专业模块回传用） |

---

## 评分表 `/api/score-tables`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/score-tables` | 评分表列表 |
| POST | `/score-tables` | 新增评分表 |
| PATCH | `/score-tables/:id` | 编辑 |
| DELETE | `/score-tables/:id` | 删除 |
| POST | `/score-tables/:id/judge` | 提交打分 |
| GET | `/score-tables/:id/records` | 打分记录列表 |

---

## 超管 `/api/admin`

| 方法 | 路径 | 角色 | 说明 |
|------|------|------|------|
| GET | `/admin/tenants` | SUPER_ADMIN | 机构列表 |
| POST | `/admin/tenants` | SUPER_ADMIN | 新增机构 |
| PATCH | `/admin/tenants/:id` | SUPER_ADMIN | 编辑机构 |
| DELETE | `/admin/tenants/:id` | SUPER_ADMIN | 删除机构 |
| POST | `/admin/tenants/:id/modules` | SUPER_ADMIN | 授权模块 |
| DELETE | `/admin/tenants/:id/modules/:mid` | SUPER_ADMIN | 取消授权 |
| GET | `/admin/stats` | SUPER_ADMIN | 平台统计数据 |

---

## AI 大模型管理 `/api/ai`

### 超管端点 `/api/ai/admin`

| 方法 | 路径 | 角色 | 说明 |
|------|------|------|------|
| GET | `/ai/admin/providers` | SUPER_ADMIN | 获取所有 AI 服务商 |
| POST | `/ai/admin/providers` | SUPER_ADMIN | 创建 AI 服务商 |
| PUT | `/ai/admin/providers/:id` | SUPER_ADMIN | 更新 AI 服务商 |
| DELETE | `/ai/admin/providers/:id` | SUPER_ADMIN | 删除 AI 服务商 |
| GET | `/ai/admin/models` | SUPER_ADMIN | 获取所有 AI 模型 |
| POST | `/ai/admin/models` | SUPER_ADMIN | 创建 AI 模型 |
| PUT | `/ai/admin/models/:id` | SUPER_ADMIN | 更新 AI 模型 |
| DELETE | `/ai/admin/models/:id` | SUPER_ADMIN | 删除 AI 模型 |
| GET | `/ai/admin/tenant-models` | SUPER_ADMIN | 获取机构模型配置 |
| POST | `/ai/admin/tenant-models` | SUPER_ADMIN | 为机构设置模型 |
| DELETE | `/ai/admin/tenant-models` | SUPER_ADMIN | 移除机构模型配置 |
| GET | `/ai/admin/quotas/platform` | SUPER_ADMIN | 获取平台总配额 |
| GET | `/ai/admin/quotas` | SUPER_ADMIN | 获取所有机构配额 |
| POST | `/ai/admin/quotas` | SUPER_ADMIN | 分配配额给机构 |
| GET | `/ai/admin/alerts` | SUPER_ADMIN | 获取预警记录 |
| POST | `/ai/admin/alerts/:id/resolve` | SUPER_ADMIN | 标记预警为已处理 |
| GET | `/ai/admin/stats/platform` | SUPER_ADMIN | 获取平台使用统计 |
| GET | `/ai/admin/stats/tenant` | SUPER_ADMIN | 获取机构使用统计 |

### 机构端点 `/api/ai/tenant`

| 方法 | 路径 | 角色 | 说明 |
|------|------|------|------|
| GET | `/ai/tenant/services` | TENANT_ADMIN+ | 获取本机构可用服务（只读） |
| GET | `/ai/tenant/stats` | TENANT_ADMIN+ | 获取本机构使用统计 |
| POST | `/ai/tenant/recharge` | TENANT_ADMIN+ | 创建充值订单 |
| GET | `/ai/tenant/recharges` | TENANT_ADMIN+ | 获取充值记录 |
| POST | `/ai/tenant/quota-request` | TENANT_ADMIN+ | 申请增加配额 |
| GET | `/ai/tenant/alerts` | TENANT_ADMIN+ | 获取本机构预警记录 |

---

## 错误码

| code | 说明 |
|------|------|
| 200 | 成功 |
| 400 | 参数错误 / 业务校验失败 |
| 401 | 未认证 / Token 无效 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 429 | 请求频率超限（验证码） |
| 500 | 服务器内部错误 |
