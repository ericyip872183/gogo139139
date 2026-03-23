// 数据库初始化脚本 — 创建默认租户和超级管理员账号
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // 创建默认租户
  const tenant = await prisma.tenant.upsert({
    where: { code: 'DEFAULT' },
    update: {},
    create: {
      id: 'default-tenant',
      name: '默认机构',
      code: 'DEFAULT',
    },
  })
  console.log('租户已创建:', tenant.name)

  // 创建超级管理员
  const hash = await bcrypt.hash('admin123', 10)
  const user = await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: 'admin' } },
    update: {},
    create: {
      tenantId: tenant.id,
      username: 'admin',
      password: hash,
      realName: '超级管理员',
      role: 'SUPER_ADMIN',
    },
  })
  console.log('管理员已创建:', user.username, '/ 密码: admin123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
