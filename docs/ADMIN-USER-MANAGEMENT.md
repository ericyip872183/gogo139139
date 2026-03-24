# 超级管理员 - 机构与用户全量管理方案

> 文档版本：v1.0
> 创建时间：2026-03-24
> 状态：✅ 已确认，开发中

---

## 一、完整需求清单

| 功能模块 | 具体需求 |
|----------|----------|
| 机构成员管理 | 查看/新增/编辑/删除/重置密码/修改角色/启用禁用 |
| 跨机构搜索 | 按手机号/邮箱/姓名查找用户在哪些机构 |
| 批量操作 | 批量导入/批量删除/批量修改角色 |
| 操作日志 | 记录超管对用户的所有修改操作 |
| 新建用户 | 超管可直接创建平台级用户 |
| 全库查看 | 查看整个数据库的用户内容 |
| 组织架构 | 查看机构的树形组织架构 |

---

## 二、功能架构设计

### Tab 结构（超管后台首页）

```
┌────────────────────────────────────────────────────────────────┐
│  [1] 机构管理  │  [2] 机构成员  │  [3] 全库用户  │  [4] 模块定义  │  [5] 平台概览  │
└────────────────────────────────────────────────────────────────┘
```

---

## 三、各 Tab 详细设计

### Tab 1: 机构管理（现有 + 增强）

**现有功能保留**：
- 机构列表（搜索/新增/编辑/启用禁用）
- 模块授权
- 创建管理员

**新增操作**：
- **查看成员** → 切换到"机构成员"Tab，自动选中该机构
- **查看架构** → 弹出组织架构树形图（只读）

---

### Tab 2: 机构成员（新增）

**界面布局**：
```
┌───────────────────────────────────────────────────────────────┐
│ 当前机构：[选择机构 ▼]   已选：XX 机构                        │
├───────────────────────────────────────────────────────────────┤
│ [搜索：姓名/用户名/手机] 🔍  [+ 新增成员]  [批量导入]  [批量删除]│
├───────────────────────────────────────────────────────────────┤
│ ☐ │ 用户名 │ 姓名 │ 角色 │ 手机/邮箱 │ 状态 │ 创建时间 │ 操作 │
├───┼────────┼──────┼──────┼───────────┼──────┼──────────┼──────┤
│ ☐ │ zs     │ 张三 │ 教师 │ 138***    │ 正常 │ 2026-01  │ ...  │
└───┴────────┴──────┴──────┴───────────┴──────┴──────────┴──────┘
│ 共 XX 条  [< 1 2 3 >]
└───────────────────────────────────────────────────────────────┘
```

**操作列功能**：
- 编辑信息
- 修改角色（下拉框：TENANT_ADMIN / TEACHER / STUDENT / SCHOOL / CLASS）
- 重置密码
- 删除
- 启用/禁用

**新增成员弹窗**：
```
┌─────────────────────────────────────┐
│ 新增成员 — XX 机构                   │
├─────────────────────────────────────┤
│ 用户名：[________]  (同机构内唯一)   │
│ 真实姓名：[________]                │
│ 角色：[TENANT_ADMIN ▼]             │
│ 手机号：[________]                  │
│ 邮箱：[________]                    │
│ 初始密码：[________] (至少 6 位)      │
└─────────────────────────────────────┘
```

**批量导入弹窗**：
- 下载 Excel 模板
- 上传 Excel 文件
- 预览导入结果（成功/失败条数）
- 错误详情显示

---

### Tab 3: 全库用户（新增）

**界面布局**：
```
┌───────────────────────────────────────────────────────────────┐
│ [搜索：姓名/用户名/手机/邮箱] 🔍  [机构：全部 ▼]  [角色：全部 ▼]│
├───────────────────────────────────────────────────────────────┤
│ 用户名 │ 姓名 │ 角色 │ 所属机构 │ 手机/邮箱 │ 状态 │ 操作      │
├────────┼──────┼──────┼──────────┼───────────┴──────┼──────────┤
│ admin  │ 李四 │ 超管 │ 平台      │ 139***    │ 正常 │ 编辑...  │
│ zs     │ 张三 │ 教师 │ XX 学校   │ 138***    │ 正常 │ 编辑...  │
└────────┴──────┴──────┴──────────┴───────────┴──────┴──────────┘
│ 共 XXXX 条  [< 1 2 3 ... 50 >]
└───────────────────────────────────────────────────────────────┘
```

**核心功能**：
- 查看平台所有用户（跨机构）
- 按机构筛选
- 按角色筛选
- 跨机构搜索（输入手机号/邮箱，显示该用户在哪些机构有账号）

**操作列功能**：
- 编辑信息
- 修改角色
- 重置密码
- 删除
- 启用/禁用
- **查看所属机构**（弹窗显示该用户在的所有机构）

---

### Tab 4: 模块定义（现有）

保持不变

---

### Tab 5: 平台概览（增强）

**现有功能**：6 个统计卡片

**新增内容**：
- 用户按角色分布饼图
- 机构按模块授权分布柱状图
- 最近 7 天新增用户趋势图
- 最近操作日志列表

---

## 四、后端接口设计

### 4.1 机构成员管理（新增）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/tenants/:tenantId/users` | 机构成员列表（分页 + 筛选） |
| POST | `/admin/tenants/:tenantId/users` | 新增机构成员 |
| PATCH | `/admin/tenants/:tenantId/users/:userId` | 编辑机构成员 |
| DELETE | `/admin/tenants/:tenantId/users/:userId` | 删除机构成员 |
| PATCH | `/admin/tenants/:tenantId/users/:userId/role` | 修改成员角色 |
| PATCH | `/admin/tenants/:tenantId/users/:userId/reset-password` | 重置密码 |
| POST | `/admin/tenants/:tenantId/users/batch-delete` | 批量删除 |
| POST | `/admin/tenants/:tenantId/users/import` | 批量导入 |
| GET | `/admin/tenants/:tenantId/users/export` | 批量导出 |

### 4.2 全库用户管理（新增）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/users` | 全库用户列表（分页 + 筛选） |
| GET | `/admin/users/:id` | 用户详情（含所属机构列表） |
| PATCH | `/admin/users/:userId` | 编辑用户（超管直接修改） |
| GET | `/admin/users/search/by-contact` | 按手机/邮箱搜索（返回所有匹配用户及机构） |

### 4.3 组织架构（新增）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/tenants/:tenantId/organizations` | 获取机构组织架构树 |

### 4.4 操作日志（新增）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/operation-logs` | 操作日志列表（分页 + 筛选） |

---

## 五、数据库设计

### 新增表：`admin_operation_logs`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | PK |
| adminId | String | 超管 ID |
| action | String | 操作类型（CREATE_USER / UPDATE_USER / DELETE_USER / RESET_PASSWORD 等） |
| targetType | String | 目标类型（USER / TENANT / MODULE） |
| targetId | String | 目标 ID |
| targetName | String? | 目标名称（冗余，方便查询） |
| details | Json? | 操作详情（修改前后的值） |
| createdAt | DateTime | 操作时间 |

**Prisma Schema**：
```prisma
model AdminOperationLog {
  id         String   @id @default(cuid())
  adminId    String
  action     String
  targetType String
  targetId   String
  targetName String?
  details    Json?
  createdAt  DateTime @default(now())

  @@index([adminId])
  @@index([targetType, targetId])
  @@index([createdAt])
}
```

---

## 六、前端 API 封装

`src/api/admin.ts` 新增：

```typescript
export const adminApi = {
  // ... 现有接口保留 ...

  // 机构成员管理
  listTenantUsers: (tenantId: string, params?: any) =>
    request.get(`/admin/tenants/${tenantId}/users`, { params }),
  createTenantUser: (tenantId: string, data: any) =>
    request.post(`/admin/tenants/${tenantId}/users`, data),
  updateTenantUser: (tenantId: string, userId: string, data: any) =>
    request.patch(`/admin/tenants/${tenantId}/users/${userId}`, data),
  deleteTenantUser: (tenantId: string, userId: string) =>
    request.delete(`/admin/tenants/${tenantId}/users/${userId}`),
  updateTenantUserRole: (tenantId: string, userId: string, role: string) =>
    request.patch(`/admin/tenants/${tenantId}/users/${userId}/role`, { role }),
  resetTenantUserPassword: (tenantId: string, userId: string, newPassword: string) =>
    request.patch(`/admin/tenants/${tenantId}/users/${userId}/reset-password`, { newPassword }),
  batchDeleteTenantUsers: (tenantId: string, userIds: string[]) =>
    request.post(`/admin/tenants/${tenantId}/users/batch-delete`, { userIds }),
  importTenantUsers: (tenantId: string, file: File) =>
    request.upload(`/admin/tenants/${tenantId}/users/import`, file),
  exportTenantUsers: (tenantId: string, params?: any) =>
    request.download(`/admin/tenants/${tenantId}/users/export`, { params }),

  // 全库用户管理
  listAllUsers: (params?: any) => request.get('/admin/users', { params }),
  getUserDetail: (userId: string) => request.get(`/admin/users/${userId}`),
  updateUser: (userId: string, data: any) => request.patch(`/admin/users/${userId}`, data),
  searchUserByContact: (contact: string) =>
    request.get('/admin/users/search/by-contact', { params: { contact } }),

  // 组织架构
  getTenantOrganizations: (tenantId: string) =>
    request.get(`/admin/tenants/${tenantId}/organizations`),

  // 操作日志
  getOperationLogs: (params?: any) => request.get('/admin/operation-logs', { params }),
}
```

---

## 七、开发任务清单

### 后端（NestJS）

| 文件 | 任务 |
|------|------|
| `prisma/schema.prisma` | 新增 `AdminOperationLog` 模型 |
| `admin/admin.controller.ts` | 新增 15+ 个接口 |
| `admin/admin.service.ts` | 实现所有业务逻辑 |
| `admin/dto/admin.dto.ts` | 新增 DTO 类 |
| `common/interceptors/logging.interceptor.ts` | 新增操作日志拦截器（可选） |

### 前端（Vue3）

| 文件 | 任务 |
|------|------|
| `src/api/admin.ts` | 封装所有新增 API |
| `src/views/admin/AdminView.vue` | 新增 2 个 Tab（机构成员、全库用户） |
| `src/views/admin/components/` | 抽取可复用组件（用户列表/编辑表单/批量导入） |

---

## 八、权限与安全

1. **所有接口**必须验证 `SUPER_ADMIN` 角色
2. **密码重置**：新密码必须加密存储（bcrypt）
3. **操作日志**：记录所有写操作（CREATE/UPDATE/DELETE）
4. **批量导入**：限制文件大小（< 5MB）、单次导入条数（< 1000 条）
5. **敏感操作确认**：删除/重置密码需二次确认

---

## 九、配置确认

| 问题 | 确认方案 |
|------|----------|
| 操作日志保留多久？ | 保留 180 天，自动清理 |
| 批量导入失败如何处理？ | 部分成功：成功条数 + 失败明细 Excel 下载 |
| 用户删除逻辑？ | 软删除（`isDeleted` 字段），保留数据关联性 |
| 是否需要导出全部用户？ | 提供"导出当前筛选结果"功能 |
| 超管能否直接创建"平台级用户"？ | 新增"平台用户"概念，不属于任何机构 |

---

## 十、开发进度

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 1 | 数据库设计 + Prisma Schema | ✅ 已完成 |
| Phase 2 | 后端接口实现 | ✅ 已完成 |
| Phase 3 | 前端 API 封装 | ✅ 已完成 |
| Phase 4 | 前端页面实现 | ✅ 已完成 |
| Phase 5 | 联调测试 | ⏳ 待测试 |

---

## 十一、已完成清单

### 数据库
- [x] 创建 `admin_operation_logs` 表（SQL 直接执行）

### 后端（NestJS）
- [x] `UserRole` 枚举和所有 DTO 类（`admin.dto.ts`）
- [x] 机构成员管理方法（`listTenantUsers`, `createTenantUser`, `updateTenantUser`, `deleteTenantUser`, `batchDeleteTenantUsers`, `updateTenantUserRole`, `resetTenantUserPassword`）
- [x] 全库用户管理方法（`listAllUsers`, `getUserDetail`, `updateUser`, `deleteUser`, `searchUserByContact`）
- [x] 组织架构方法（`getTenantOrganizations`）
- [x] 操作日志方法（`logOperation`, `getOperationLogs`）
- [x] 对应 Controller 端点（16+ 个 API）

### 前端（Vue3）
- [x] `src/api/admin.ts` - 所有新增 API 封装
- [x] `AdminView.vue` - 新增「机构成员」和「全库用户」两个 Tab
- [x] 用户列表表格（支持选择、分页、角色显示）
- [x] 新增/编辑用户弹窗
- [x] 重置密码弹窗
- [x] 组织架构树抽屉
- [x] 批量删除功能
- [x] 角色标签和文本映射工具函数

### 前端（MainLayout）
- [x] 机构管理员和学校管理员可见「组织架构」和「用户管理」菜单
