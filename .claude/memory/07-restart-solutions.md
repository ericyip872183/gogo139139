# 常见问题与重启解决方案

> 本文档记录项目启动、容器重启、常见错误的解决方案。**遇到问题时首先查阅本文档。**

---

## 一、容器重启规则

### 1.1 何时需要重启

| 场景 | 操作 | 说明 |
|------|------|------|
| 修改后端代码后 | `docker restart panlei-backend` | 后端代码不会热重载 |
| 修改前端代码后 | `docker restart panlei-frontend` | 前端代码不会热重载 |
| 修改依赖后 | `docker-compose up -d --build` | 需要重新构建 |
| 数据库连接失败 | `docker restart panlei-backend` | 等待 MySQL 就绪 |
| 端口被占用 | `docker-compose down && docker-compose up -d` | 重置所有容器 |
| 环境变量修改后 | `docker-compose up -d` | 重新加载环境变量 |

### 1.2 标准重启流程

```bash
# 步骤 1：进入项目目录
cd c:\项目\panlei

# 步骤 2：查看容器状态
docker ps

# 步骤 3：重启目标容器
docker restart panlei-backend
docker restart panlei-frontend

# 步骤 4：等待就绪（约 10-20 秒）

# 步骤 5：验证服务
curl http://localhost:3002/api/health
```

### 1.3 完全重置流程

```bash
# ⚠️ 警告：这会删除所有容器数据！

# 步骤 1：停止所有容器
docker-compose down

# 步骤 2：删除数据卷（可选，会删除数据库数据）
docker volume rm panlei_mysql_data
docker volume rm panlei_redis_data

# 步骤 3：重新启动
docker-compose up -d

# 步骤 4：初始化数据库
docker exec panlei-backend sh -c "cd /app/packages/backend && prisma db push"
```

---

## 二、常见启动错误

### 2.1 后端启动失败

#### 错误 1：数据库连接失败

```
PrismaClientInitializationError: Can't reach database server at `mysql:3306`
```

**原因**：
- MySQL 容器还没完全启动（健康检查未通过）
- 容器网络配置问题

**解决方案**：
```bash
# 方案 1：等待 MySQL 就绪后重启后端
sleep 10
docker restart panlei-backend

# 方案 2：检查 MySQL 容器状态
docker ps | grep mysql

# 方案 3：查看 MySQL 日志
docker logs panlei-mysql -f --tail 50
```

#### 错误 2：端口被占用

```
Error: Bind for 0.0.0.0:3002 failed: port is already allocated
```

**原因**：
- 3002 端口已被其他进程占用

**解决方案**：
```bash
# Windows：查找占用端口的进程
netstat -ano | findstr :3002

# 杀死占用端口的进程（替换 PID）
taskkill /F /PID <PID>

# 或者修改 docker-compose.dev.yml 中的端口映射
```

#### 错误 3：环境变量缺失

```
Error: Missing environment variable: DATABASE_URL
```

**原因**：
- `.env` 文件不存在或未正确加载

**解决方案**：
```bash
# 方案 1：创建 .env 文件
cp .env.example .env
# 编辑 .env 文件，填写正确的配置

# 方案 2：重启容器加载环境变量
docker-compose down
docker-compose up -d
```

### 2.2 前端启动失败

#### 错误 1：后端代理失败

```
[vite] http proxy error: /api
Error: connect ECONNREFUSED 127.0.0.1:3002
```

**原因**：
- 后端服务未启动
- 代理配置指向错误的地址

**解决方案**：
```bash
# 方案 1：检查后端是否运行
docker ps | grep backend

# 方案 2：重启后端
docker restart panlei-backend

# 方案 3：检查 vite.config.ts 代理配置
# 确保配置为 http://backend:3000（容器内通信）
```

#### 错误 2：依赖缺失

```
Error: Cannot find module 'xxx'
```

**原因**：
- node_modules 未正确安装

**解决方案**：
```bash
# 重新安装依赖
pnpm install

# 重新构建容器
docker-compose up -d --build
```

### 2.3 登录失败

#### 错误：用户名或密码错误

```json
{"code": 401, "message": "用户名或密码错误"}
```

**原因**：
- 数据库中的密码 hash 不正确
- 不同环境下 bcrypt 生成的 hash 可能不一致

**解决方案**：
```bash
# 在后端容器内重新生成密码
docker exec panlei-backend node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
(async () => {
  const hash = await bcrypt.hash('admin123', 10);
  await prisma.\$connect();
  await prisma.user.updateMany({
    where: { username: 'admin' },
    data: { password: hash }
  });
  console.log('Password updated');
  await prisma.\$disconnect();
})();
"
```

---

## 三、API 接口错误

### 3.1 401 未授权

```json
{"code": 401, "message": "未授权"}
```

**原因**：
- Token 未携带
- Token 已过期
- Token 格式错误

**解决方案**：
```javascript
// 检查请求头是否正确
headers: {
  'Authorization': `Bearer ${token}`
}

// 重新登录获取新 token
```

### 3.2 403 无权限

```json
{"code": 403, "message": "无权限"}
```

**原因**：
- 用户角色不匹配接口要求

**解决方案**：
- 检查用户角色是否满足接口要求
- 使用更高权限的账号登录

### 3.3 404 接口不存在

```json
{"code": 404, "message": "接口不存在"}
```

**原因**：
- 接口路径错误
- 后端未正确注册路由

**解决方案**：
```bash
# 检查后端路由注册
docker logs panlei-backend -f --tail 50

# 检查接口路径是否正确（是否包含 /api 前缀）
```

### 3.4 500 内部错误

```json
{"code": 500, "message": "内部错误"}
```

**原因**：
- 数据库查询失败
- 业务逻辑错误
- 空指针异常

**解决方案**：
```bash
# 查看后端日志定位错误
docker logs panlei-backend -f --tail 100

# 查找 "Error:" 或 "Exception:" 关键字
```

---

## 四、数据库问题

### 4.1 Prisma 同步失败

```
Error: Prisma schema validation error
```

**原因**：
- schema.prisma 语法错误
- 数据库表结构与应用不一致

**解决方案**：
```bash
# 重新同步数据库
docker exec panlei-backend sh -c "cd /app/packages/backend && prisma db push"

# 或者使用 Studio 可视化检查
pnpm db:studio
```

### 4.2 查询返回空数据

**原因**：
- tenantId 不匹配
- 数据不存在

**解决方案**：
```bash
# 使用 Prisma Studio 检查数据
pnpm db:studio

# 检查 tenantId 是否正确（从 JWT Token 中提取）
```

---

## 五、前端页面问题

### 5.1 页面空白

**原因**：
- JavaScript 错误
- 组件渲染失败

**解决方案**：
1. 打开浏览器 Console（F12）
2. 查看红色错误信息
3. 根据错误信息定位问题

### 5.2 数据不显示

**原因**：
- API 请求失败
- 数据格式不匹配

**解决方案**：
1. 打开 Network 标签页
2. 检查 API 请求状态
3. 查看响应数据格式

### 5.3 样式错乱

**原因**：
- CSS 未正确加载
- 元素类名错误

**解决方案**：
1. 检查 Network 中 CSS 文件是否加载
2. 检查 Element Plus 是否正确引入

---

## 六、调试检查流程

### 6.1 标准调试流程

```
1. 复现问题
        ↓
2. 查看日志（后端/前端/容器）
        ↓
3. 定位错误信息
        ↓
4. 分析问题原因
        ↓
5. 尝试解决方案
        ↓
6. 验证是否修复
        ↓
7. 记录到本文档
```

### 6.2 日志查看命令

```bash
# 后端日志
docker logs panlei-backend -f --tail 100

# 前端日志
docker logs panlei-frontend -f --tail 50

# MySQL 日志
docker logs panlei-mysql -f --tail 50

# Redis 日志
docker logs panlei-redis -f --tail 50

# 所有容器状态
docker ps -a
```

---

## 七、问题记录模板

> 每次解决新问题后，必须记录到本文档

---

### YYYY-MM-DD - 问题标题

**错误信息**：
```
错误日志/截图
```

**原因分析**：
- ...

**解决方案**：
```bash
# 解决命令
```

**预防方法**：
- ...

---

## 八、快速修复命令汇总

```bash
# 重启后端
docker restart panlei-backend

# 重启前端
docker restart panlei-frontend

# 重启所有容器
docker-compose restart

# 完全重置
docker-compose down && docker-compose up -d

# 查看后端日志
docker logs panlei-backend -f --tail 100

# 检查数据库连接
docker exec panlei-backend sh -c "nc -zv mysql 3306"

# 重置管理员密码
docker exec panlei-backend node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
(async () => {
  const hash = await bcrypt.hash('admin123', 10);
  await prisma.user.updateMany({
    where: { username: 'admin' },
    data: { password: hash }
  });
  console.log('Done');
  await prisma.\$disconnect();
})();
"

# 同步数据库
docker exec panlei-backend sh -c "cd /app/packages/backend && prisma db push"
```
