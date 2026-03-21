#!/bin/bash
# 盼蕾平台一键部署脚本
# 使用方法：chmod +x deploy.sh && ./deploy.sh

set -e

echo "=============================="
echo " 盼蕾平台生产环境部署"
echo "=============================="

# 1. 检查 .env 文件
if [ ! -f .env ]; then
  echo "❌ 未找到 .env 文件，请先复制并修改："
  echo "   cp .env.production.example .env && nano .env"
  exit 1
fi

# 2. 拉取最新代码（如有 git 仓库）
if [ -d .git ]; then
  echo "📥 拉取最新代码..."
  git pull
fi

# 3. 构建并启动
echo "🐳 构建 Docker 镜像..."
docker compose -f docker-compose.prod.yml --env-file .env build --no-cache

echo "🚀 启动服务..."
docker compose -f docker-compose.prod.yml --env-file .env up -d

# 4. 等待数据库就绪
echo "⏳ 等待数据库启动..."
sleep 15

# 5. 执行数据库迁移
echo "🗃️  执行数据库迁移..."
docker exec panlei-backend sh -c "cd /app/packages/backend && npx prisma migrate deploy"

echo ""
echo "✅ 部署完成！"
echo "   访问地址：http://your-server-ip"
echo ""
echo "查看日志："
echo "  docker compose -f docker-compose.prod.yml logs -f"
