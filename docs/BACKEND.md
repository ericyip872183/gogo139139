# 盼蕾平台 — 后端架构

> **本文件描述 NestJS 后端的模块结构、Service/Controller 开发规范、中间件、Guards 及多租户隔离机制。开发后端接口时查阅。**

---

## 目录结构

```
packages/backend/src/
├── main.ts                        # 启动入口（全局前缀/api、ValidationPipe）
├── app.module.ts                  # 根模块，注册所有子模块
├── prisma/
│   └── prisma.service.ts          # PrismaClient 封装（单例）
├── common/
│   ├── decorators/
│   │   └── current-user.decorator.ts  # @CurrentUser() 提取 JWT 用户
│   ├── filters/
│   │   └── http-exception.filter.ts   # 统一错误响应格式
│   ├── interceptors/
│   │   └── response.interceptor.ts    # 统一成功响应格式
│   └── guards/
│       └── roles.guard.ts             # 角色权限守卫
└── modules/
    ├── auth/
    │   ├── auth.module.ts
    │   ├── auth.controller.ts
    │   ├── auth.service.ts
    │   ├── code.service.ts            # 验证码（Redis）
    │   ├── jwt.strategy.ts            # Passport JWT
    │   └── dto/login.dto.ts
    ├── users/
    ├── organizations/
    ├── questions/
    ├── papers/
    ├── exams/
    ├── exam-room/
    ├── scores/
    ├── score-tables/
    └── admin/
```

---

## 模块结构规范

每个业务模块必须包含：

```
{module}/
├── {module}.module.ts     # 注册 Controller、Service、导入依赖
├── {module}.controller.ts # HTTP 路由，只做参数提取和调用 Service
├── {module}.service.ts    # 业务逻辑，数据库操作
└── dto/
    └── {module}.dto.ts    # 请求体 DTO（class-validator 装饰器）
```

### Controller 规范
```typescript
@Controller('{module}')
export class {Module}Controller {
  constructor(private {module}Service: {Module}Service) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryDto
  ) {
    return this.{module}Service.findAll(user.tenantId, query)
  }
}
```

### Service 规范
```typescript
@Injectable()
export class {Module}Service {
  constructor(private prisma: PrismaService) {}

  // tenantId 始终作为第一个参数（多租户隔离）
  async findAll(tenantId: string, query: QueryDto) {
    return this.prisma.{model}.findMany({
      where: { tenantId, ...filters },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    })
  }
}
```

---

## 多租户隔离

**原则：所有查询必须带 `tenantId` 条件**

```typescript
// ✅ 正确
await prisma.user.findMany({ where: { tenantId, username } })

// ❌ 错误（缺少 tenantId）
await prisma.user.findMany({ where: { username } })
```

`tenantId` 来源：
```typescript
// JWT Payload
{ sub: userId, tenantId: 'tenant_xxx', role: 'TEACHER' }

// Controller 中提取
@CurrentUser() user: { id: string; tenantId: string; role: string }
```

---

## JWT 认证

```typescript
// 需要认证的接口
@UseGuards(AuthGuard('jwt'))

// 需要特定角色
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('SUPER_ADMIN', 'TEACHER')

// 公开接口（无需认证）
// 不加 @UseGuards 即可
```

### JWT Payload
```typescript
interface JwtPayload {
  sub: string      // userId
  tenantId: string
  role: string
  iat: number
  exp: number
}
```

---

## DTO 规范

```typescript
// 使用 class-validator 装饰器
export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string

  @IsString()
  @MinLength(6, { message: '密码至少6位' })
  password: string

  @IsEnum(['TEACHER', 'STUDENT'])
  role: string

  @IsOptional()
  @IsEmail()
  email?: string
}
```

`main.ts` 中全局开启验证：
```typescript
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
```

---

## 统一响应格式

通过 `ResponseInterceptor` 自动包装：

```typescript
// 原始 return { name: 'admin' }
// 自动变成：
{ "code": 200, "message": "success", "data": { "name": "admin" }, "timestamp": "..." }
```

错误通过 `HttpExceptionFilter` 统一格式：
```typescript
{ "code": 400, "message": "用户名不能为空", "data": null, "timestamp": "..." }
```

---

## Redis / CodeService

```typescript
// 验证码存储格式
key: `{tenantId}:{contact}:{purpose}`  // 如 tenant_xxx:13800138000:login
value: "123456"
TTL: 5分钟

// 频率限制
key: `rate:{tenantId}:{contact}:{purpose}`
value: 发送次数
TTL: 1小时，超过5次拒绝
```

---

## 新增模块步骤

```bash
# 1. 创建模块文件（可用 NestJS CLI）
# nest g module modules/{name}
# nest g controller modules/{name}
# nest g service modules/{name}

# 2. 在 app.module.ts 的 imports 数组中注册

# 3. 在 schema.prisma 添加对应表

# 4. 运行同步
docker exec panlei-backend sh -c "cd /app/packages/backend && prisma db push"

# 5. 在 docs/API.md 中登记新接口
# 6. 在 docs/PROGRESS.md 中更新状态
```
