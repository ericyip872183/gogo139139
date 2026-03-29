# 容器与部署规范

> 本文档规定容器管理、Git 提交、自动构建、部署的标准流程。

---

## 一、容器管理

### 1.1 容器架构

```
┌─────────────────────────────────────────────────────────┐
│                      本地开发环境                         │
│                                                         │
│   ┌─────────────┐    ┌─────────────┐    ┌───────────┐  │
│   │  frontend   │    │   backend   │    │  数据库    │  │
│   │  :5173      │    │   :3002     │    │  容器们    │  │
│   └─────────────┘    └─────────────┘    │ mysql    │  │
│                                          │ redis    │  │
│   访问入口                                └───────────┘  │
│   http://localhost:5173                                  │
└─────────────────────────────────────────────────────────┘
```

### 1.2 容器列表

| 容器名 | 作用 | 端口 | 说明 |
|--------|------|------|------|
| panlei-frontend | 前端界面 | 5173 | Vue 3 + Vite |
| panlei-backend | 后端服务 | 3002 | NestJS |
| panlei-mysql | 数据库 | 3306 | MySQL 8 |
| panlei-redis | 缓存 | 6379 | Redis 7 |

### 1.3 容器启动流程

```bash
# 步骤 1：确保 Docker Desktop 已启动
# Windows：打开 Docker Desktop 应用

# 步骤 2：进入项目目录
cd c:\项目\panlei

# 步骤 3：启动所有容器
docker-compose -f docker-compose.dev.yml up -d

# 步骤 4：等待服务就绪（约 10-20 秒）
# 检查状态
docker ps

# 步骤 5：验证服务
curl http://localhost:3002/api/health
```

### 1.4 容器重启规则

**重要：** 修改代码后必须重启容器！

```bash
# 重启所有容器
docker-compose -f docker-compose.dev.yml restart

# 仅重启后端（修改后端代码后）
docker restart panlei-backend

# 仅重启前端（修改前端代码后）
docker restart panlei-frontend

# 重新构建并启动（修改依赖后）
docker-compose -f docker-compose.dev.yml up -d --build
```

### 1.5 容器日志查看

```bash
# 查看后端日志（实时）
docker logs panlei-backend -f --tail 50

# 查看前端日志
docker logs panlei-frontend -f --tail 20

# 查看特定时间段日志
docker logs panlei-backend --since 2026-03-28T10:00:00
```

### 1.6 容器故障排查

```bash
# 1. 查看容器状态
docker ps -a

# 2. 检查容器健康状态
docker inspect panlei-backend | grep Health

# 3. 测试容器间网络
docker exec panlei-backend sh -c "nc -zv mysql 3306"
docker exec panlei-backend sh -c "nc -zv redis 6379"

# 4. 进入容器内部
docker exec -it panlei-backend sh
docker exec -it panlei-frontend sh
```

---

## 二、Git 提交规范

### 2.1 提交消息格式

```
<type>: <subject>

[optional body]
```

### 2.2 Type 类型

| 类型 | 说明 |
|------|------|
| feat | 新功能 |
| fix | Bug 修复 |
| docs | 文档更新 |
| style | 代码格式（不影响功能） |
| refactor | 重构 |
| test | 测试相关 |
| chore | 构建/工具/配置 |

### 2.3 提交示例

```bash
# 新功能
git commit -m "feat: 题库编辑功能实现

- 后端：QuestionsModule 新增 update/delete 接口
- 前端：QuestionsView 新增编辑弹窗
- 数据库：Question 表新增 updatedBy 字段
"

# Bug 修复
git commit -m "fix: 修复图片生成 400 错误

- 修正豆包 API 请求参数格式
- 添加错误重试机制
"

# 文档更新
git commit -m "docs: 更新 API.md 接口文档

- 新增 AI 大模型管理接口
- 更新题目媒体资源接口
"
```

### 2.4 Git 提交检查清单

提交前必须检查：
- [ ] 无敏感信息（密码、密钥、.env 文件）
- [ ] 无大型二进制文件
- [ ] 代码已通过自测
- [ ] 文档已同步更新
- [ ] 提交消息格式正确

### 2.5 Git 分支管理

```bash
# 主分支（受保护）
main       # 生产分支
master     # 开发主分支

# 功能分支命名
feature/xxx-module   # 新功能模块
fix/xxx-bug          # Bug 修复
docs/xxx-update      # 文档更新
```

---

## 三、何时提醒用户提交

### 3.1 必须提醒用户提交的情况

1. **完成一个完整功能模块后**
   - 后端接口已完成
   - 前端页面已完成
   - 自测已通过
   - 文档已更新

2. **准备离开当前会话前**
   - 提醒用户检查变更
   - 确认是否提交

3. **达到一个重要里程碑后**
   - Sprint 完成
   - 版本发布前

### 3.2 提醒方式

```markdown
## 📝 提交建议

本次会话完成以下内容：
- ✅ XXX 功能实现
- ✅ YYY 功能优化

建议提交到 Git：
```bash
git add packages/backend/src/modules/xxx/
git add packages/frontend/src/views/xxx/
git commit -m "feat: xxx 功能实现"
```

是否需要我帮你准备提交？
```

---

## 四、自动构建与部署

### 4.1 本地开发构建

```bash
# 前端构建（开发模式）
pnpm dev:frontend

# 后端构建（开发模式）
pnpm dev:backend

# 同时启动前后端
pnpm dev
```

### 4.2 生产构建

```bash
# 前端生产构建
pnpm build:frontend
# 输出：packages/frontend/dist/

# 后端生产构建
pnpm build:backend
# 输出：packages/backend/dist/
```

### 4.3 Docker 部署流程

```bash
# 步骤 1：SSH 登录服务器
ssh -i C:/Users/23791/.ssh/id_rsa root@120.77.144.5

# 步骤 2：上传代码
scp -r packages/backend packages/frontend deploy ... root@120.77.144.5:/root/panlei/

# 步骤 3：创建/更新 .env
cp .env.production.example .env
# 编辑 .env 文件

# 步骤 4：构建并启动
cd /root/panlei
docker compose -f docker-compose.prod.yml --env-file .env build
docker compose -f docker-compose.prod.yml --env-file .env up -d

# 步骤 5：初始化数据库
docker exec panlei-backend sh -c "cd /app/packages/backend && prisma db push"

# 步骤 6：创建超管账号（首次部署）
docker exec panlei-backend node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
(async () => {
  const hash = await bcrypt.hash('admin123', 10);
  await prisma.tenant.create({ data: { name: '盼蕾平台', code: 'PLATFORM', isActive: true } })
    .catch(() => console.log('Tenant already exists'));
  const tenant = await prisma.tenant.findUnique({ where: { code: 'PLATFORM' } });
  await prisma.user.create({ data: { tenantId: tenant.id, username: 'admin', password: hash, realName: '超级管理员', role: 'SUPER_ADMIN', isActive: true } })
    .catch(() => console.log('Admin already exists'));
  console.log('Done');
  await prisma.\$disconnect();
})();
"
```

### 4.4 代码更新部署

```bash
# 步骤 1：本地修改代码

# 步骤 2：上传修改的文件
scp -i "C:/Users/23791/.ssh/id_rsa" -r packages/backend/src root@120.77.144.5:/root/panlei/packages/backend/
scp -i "C:/Users/23791/.ssh/id_rsa" -r packages/frontend/src root@120.77.144.5:/root/panlei/packages/frontend/

# 步骤 3：重新构建
ssh -i "C:/Users/23791/.ssh/id_rsa" root@120.77.144.5 'cd /root/panlei && docker compose -f docker-compose.prod.yml --env-file .env build backend'

# 步骤 4：重启
ssh -i "C:/Users/23791/.ssh/id_rsa" root@120.77.144.5 'cd /root/panlei && docker compose -f docker-compose.prod.yml up -d --no-deps backend'

# 步骤 5：如有表结构变更
docker exec panlei-backend sh -c "cd /app/packages/backend && prisma db push"
```

---

## 五、部署后检查

### 5.1 服务健康检查

```bash
# 检查容器状态
docker ps --format "table {{.Names}}\t{{.Status}}"

# 检查前端
curl http://120.77.144.5

# 检查后端
curl http://120.77.144.5/api/health

# 检查登录
curl -X POST http://120.77.144.5/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","tenantCode":"PLATFORM"}'
```

### 5.2 日志检查

```bash
# 后端日志
docker logs panlei-backend -f --tail 50

# 前端（nginx）日志
docker logs panlei-frontend -f --tail 20
```

---

## 六、常见问题

| 问题 | 解决方案 |
|------|----------|
| 容器启动失败 | 检查 Docker Desktop 是否运行 |
| 端口被占用 | `netstat -ano | findstr :3002` 查找并关闭占用进程 |
| 后端连不上数据库 | `docker restart panlei-backend` 重启后端 |
| 前端 500 错误 | 检查后端是否正常，查看后端日志 |
| 登录失败 | 重新执行密码初始化命令 |
| 修改代码没生效 | 需要 `--build` 重新构建容器 |
