# 若容平台 — 版本管理与部署规范

> **重要**：本规范确保本地代码与服务器代码保持一致，每次修改必须遵守。

---

## 一、当前状态

| 项目 | 状态 | 最后更新时间 |
|------|------|-------------|
| 本地代码 | ✅ 最新 | 2026-03-21 |
| 服务器前端 (pl.7025700.vip) | ✅ 已同步 | 2026-03-21 21:25 |
| 服务器后端 (API) | ✅ 已同步 | 2026-03-21 21:44 |
| 服务器测试环境 (120.77.144.5:8090) | ✅ 已同步（与正式共用） | - |

---

## 二、版本管理规范

### 2.1 Git 初始化（首次）

```bash
cd c:\项目\panlei

# 初始化 git 仓库
git init

# 创建 .gitignore（如已存在则跳过）
cat > .gitignore <<EOF
node_modules/
dist/
.env
*.log
.DS_Store
coverage/
EOF

# 首次提交
git add .
git commit -m "Initial commit: 若容虚拟数据平台 v1.0"

# 添加远程仓库（如有）
# git remote add origin <your-repo-url>
```

### 2.2 每次修改代码后的流程

```bash
# 1. 本地构建测试
cd c:\项目\panlei
pnpm run build:frontend

# 2. 验证本地 dist 是否正确
cat packages/frontend/dist/index.html | grep "title"

# 3. 提交代码
git add .
git commit -m "feat: 更新登录页面样式"  # 写清楚修改内容

# 4. 上传到服务器
./deploy/sync-to-server.sh
```

---

## 三、部署脚本

### 3.1 一键同步脚本（`deploy/sync-to-server.sh`）

```bash
#!/bin/bash
# 若容平台 - 一键同步到服务器
# 使用方法：./sync-to-server.sh

set -e

echo "=============================="
echo " 若容平台 - 同步到服务器"
echo "=============================="

# 1. 本地构建
echo "🔨 正在构建前端..."
cd "$(dirname "$0")/.."
pnpm run build:frontend

# 2. 验证构建
if [ ! -f "packages/frontend/dist/index.html" ]; then
  echo "❌ 构建失败，dist/index.html 不存在"
  exit 1
fi

echo "✅ 构建成功"

# 3. 上传到服务器
echo "📤 上传前端文件到服务器..."
scp -i "$HOME/.ssh/id_rsa" -r packages/frontend/dist/* root@120.77.144.5:/var/www/panlei/

echo "✅ 前端文件已上传"

# 4. 上传后端文件（如有修改）
echo "📤 上传后端文件到服务器..."
scp -i "$HOME/.ssh/id_rsa" -r packages/backend/src root@120.77.144.5:/root/panlei/packages/backend/

echo "✅ 后端文件已上传"

# 5. 重启后端服务
echo "🔄 重启后端服务..."
ssh -i "$HOME/.ssh/id_rsa" root@120.77.144.5 "
  cd /root/panlei/packages/backend
  pm2 restart panlei-backend || echo 'PM2 not configured'
"

echo ""
echo "✅ 同步完成！"
echo "   正式地址：https://pl.7025700.vip"
echo "   测试地址：http://120.77.144.5:8090"
```

### 3.2 部署脚本权限设置

```bash
cd c:\项目\panlei\deploy
chmod +x sync-to-server.sh
```

---

## 四、服务器环境说明

### 4.1 正式环境（生产）

| 配置 | 值 |
|------|-----|
| 域名 | https://pl.7025700.vip |
| 前端路径 | `/var/www/panlei/` |
| 后端路径 | `/root/panlei/packages/backend/` |
| 后端运行端口 | 3002 |
| nginx 配置 | `/etc/nginx/sites-available/panlei` |
| SSL 证书 | `/etc/letsencrypt/live/pl.7025700.vip/` |

### 4.2 测试环境

| 配置 | 值 |
|------|-----|
| 地址 | http://120.77.144.5:8090 |
| 前端路径 | `/var/www/panlei/`（与正式共用） |
| 后端运行端口 | 3002（与正式共用） |

---

## 五、版本命名规范

采用语义化版本号：`v<主版本>.<次版本>.<修订版本>`

| 版本号 | 说明 | 示例 |
|--------|------|------|
| v1.0.0 | 初始版本 | 若容虚拟数据平台首次上线 |
| v1.1.0 | 新增功能 | 新增题库管理模块 |
| v1.0.1 | Bug 修复 | 修复登录页面显示问题 |
| v2.0.0 | 重大更新 | 架构重构、Breaking Changes |

### 5.1 打版本标签

```bash
# 本地打标签
git tag -a v1.0.0 -m "若容虚拟数据平台 v1.0.0 正式发布"

# 推送标签到远程
git push origin --tags
```

---

## 六、部署检查清单

每次部署前必须确认：

- [ ] 本地代码已提交到 git
- [ ] 已运行 `pnpm run build:frontend`
- [ ] 本地验证 `packages/frontend/dist/index.html` 标题正确
- [ ] 已运行 `./deploy/sync-to-server.sh`
- [ ] 访问 https://pl.7025700.vip 验证页面正常
- [ ] 测试登录功能正常

---

## 七、回滚流程

如果部署后发现问题，需要回滚：

### 7.1 从 git 回滚

```bash
# 1. 查看历史版本
git tag -l

# 2. 检出到指定版本
git checkout v1.0.0

# 3. 重新构建
pnpm run build:frontend

# 4. 上传到服务器
./deploy/sync-to-server.sh
```

### 7.2 从服务器备份回滚

```bash
# 1. SSH 登录服务器
ssh -i ~/.ssh/id_rsa root@120.77.144.5

# 2. 查看备份（如有）
ls -la /var/www/panlei-backup/

# 3. 恢复备份
cp -r /var/www/panlei-backup/* /var/www/panlei/
```

---

## 八、常见问题

### Q1: 为什么服务器上的页面不是最新的？

**A**: 没有运行 `pnpm run build:frontend` 并上传到服务器。每次代码修改后必须执行：
```bash
pnpm run build:frontend
./deploy/sync-to-server.sh
```

### Q2: 如何确认服务器上的版本？

**A**:
```bash
# 查看 index.html
ssh root@120.77.144.5 "cat /var/www/panlei/index.html"

# 查看 JS 文件名（每次构建会变化）
ssh root@120.77.144.5 "ls /var/www/panlei/assets/*.js"
```

### Q3: 本地和服务器都有修改，如何合并？

**A**:
1. 优先以本地代码为准
2. 如服务器有紧急修复，先 SSH 登录服务器查看修改内容
3. 手动将服务器修改同步到本地
4. 再重新构建和部署

---

## 九、自动化建议（可选）

### 9.1 CI/CD 流程

使用 GitHub Actions 或 GitLab CI，实现：
- 代码 push 后自动构建
- 自动上传到服务器
- 自动验证部署成功

### 9.2 PM2 进程管理

在服务器上安装 PM2 管理后端进程：
```bash
# 安装 PM2
npm install -g pm2

# 启动后端
cd /root/panlei/packages/backend
pm2 start dist/main.js --name panlei-backend

# 保存进程列表
pm2 save

# 开机自启
pm2 startup
```

---

## 十、版本历史记录

| 版本 | 日期 | 说明 | 部署状态 |
|------|------|------|---------|
| v1.1.1 | 2026-03-21 | 修复后端 API（lookup-by-username/lookup-by-contact） | ✅ 已部署 |
| v1.1.0 | 2026-03-21 | 登录页机构自动识别 + 品牌更名若容 | ✅ 已部署 |
| v1.0.0 | 2026-03-21 | 若容虚拟数据平台正式上线 | ✅ 已部署 |
| - | 2026-03-18 | 盼蕾平台首次部署 | ⚠️ 历史版本 |

---

## 十一、v1.1.0 版本变更详情

### 新增功能
- ✅ 登录页输入用户名后自动显示机构名称
- ✅ 支持一个账号关联多个机构时的下拉选择
- ✅ 验证码登录 Tab 同样支持机构自动识别
- ✅ 忘记密码流程支持机构自动识别
- ✅ 品牌名称从"盼蕾"更改为"若容"

### 技术改动
- `LoginView.vue`: 新增 `lookupByUsername`、`lookupByContact`、`lookupForForgot` 方法
- `LoginView.vue`: 新增机构提示 UI（加载/单个/多个状态）
- `MainLayout.vue`: Logo 更改为"若容虚拟数据平台"
- `index.html`: 标题更改为"若容虚拟数据平台"

### 部署时间
- 2026-03-21 21:25 部署完成

---

## 十二、v1.1.1 版本修复详情

### 问题描述
访问 https://pl.7025700.vip 登录页输入用户名后，机构名称无法自动显示，API 返回 `Cannot GET /api/auth/lookup-by-username`

### 根本原因
1. 前端代码已更新（含自动识别机构功能）
2. 后端代码未同步到服务器（缺少 `lookupByUsername` 和 `lookupByContact` 方法）
3. 数据库 `Module` 表缺少 `phase` 字段
4. 本地 `dist/` 目录未重新构建就上传

### 修复步骤
1. 更新 `deploy/sync-to-server.sh` 增加后端同步和构建步骤
2. 同步后端源码到服务器：`scp -r packages/backend/src root@120.77.144.5:/root/panlei/packages/backend/`
3. 重新生成 Prisma Client：`pnpm prisma generate`
4. 同步数据库 schema：`pnpm prisma db push --accept-data-loss`
5. 构建并重启后端：`pnpm run build && pm2 restart panlei-backend`

### 技术改动
- `auth.controller.ts`: 新增 `lookupByUsername`、`lookupByContact` GET 接口
- `auth.service.ts`: 新增对应服务方法
- `schema.prisma`: `Module` 表新增 `phase` 字段

### 部署时间
- 2026-03-21 21:44 修复完成

### 验证方法
```bash
# 测试 API 是否正常
curl 'http://localhost:3002/api/auth/lookup-by-username?username=admin'
# 预期返回：{"code":200,"data":[{"name":"若容虚拟数据平台","code":"panlei"}]}
```
