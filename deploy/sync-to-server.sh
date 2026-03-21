#!/bin/bash
# 若容平台 - 一键同步到服务器
# 使用方法：chmod +x deploy/sync-to-server.sh && ./deploy/sync-to-server.sh

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

# 验证标题是否正确
TITLE=$(grep -o '<title>[^<]*</title>' packages/frontend/dist/index.html)
echo "✅ 构建成功 - $TITLE"

# 3. 清空服务器旧文件
echo "🗑️  清空服务器旧文件..."
ssh -i "$HOME/.ssh/id_rsa" root@120.77.144.5 "rm -rf /var/www/panlei/assets/*"

# 4. 上传到服务器
echo "📤 上传前端文件到服务器..."
scp -i "$HOME/.ssh/id_rsa" -r packages/frontend/dist/* root@120.77.144.5:/var/www/panlei/

echo "✅ 前端文件已上传"

# 5. 验证服务器文件
echo "🔍 验证服务器文件..."
ssh -i "$HOME/.ssh/id_rsa" root@120.77.144.5 "cat /var/www/panlei/index.html | grep '<title>'"

echo ""
echo "✅ 前端文件已上传"

# 6. 同步后端代码
echo "📤 上传后端代码到服务器..."
scp -i "$HOME/.ssh/id_rsa" -r packages/backend/src root@120.77.144.5:/root/panlei/packages/backend/

echo "✅ 后端代码已上传"

# 7. 服务器上构建并重启后端
echo "🔄 构建并重启后端服务..."
ssh -i "$HOME/.ssh/id_rsa" root@120.77.144.5 "
  cd /root/panlei/packages/backend
  pnpm install
  pnpm prisma generate
  pnpm run build
  pm2 restart panlei-backend
  pm2 save
"

echo "✅ 后端服务已重启"

echo ""
echo "✅ 同步完成！"
echo "   正式地址：https://pl.7025700.vip"
echo "   测试地址：http://120.77.144.5:8090"
