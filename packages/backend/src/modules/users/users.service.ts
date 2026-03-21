import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateUserDto, UpdateUserDto, QueryUserDto, ImportUserDto } from './dto/user.dto'
import { UserRole } from '@prisma/client'

// 角色层级：数字越大权限越高
const ROLE_LEVEL: Record<UserRole, number> = {
  SUPER_ADMIN: 6,
  TENANT_ADMIN: 5,
  SCHOOL: 4,
  CLASS: 3,
  TEACHER: 2,
  STUDENT: 1,
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: QueryUserDto, callerRole: UserRole) {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const skip = (page - 1) * pageSize

    const where: any = { tenantId }
    // 非超管、非机构管理员：只能看到比自己层级低的用户
    if (callerRole !== UserRole.SUPER_ADMIN && callerRole !== UserRole.TENANT_ADMIN) {
      const callerLevel = ROLE_LEVEL[callerRole]
      const visibleRoles = (Object.keys(ROLE_LEVEL) as UserRole[]).filter(
        r => ROLE_LEVEL[r] < callerLevel,
      )
      where.role = { in: visibleRoles }
    }
    if (query.keyword) {
      where.OR = [
        { username: { contains: query.keyword } },
        { realName: { contains: query.keyword } },
        { studentNo: { contains: query.keyword } },
        { phone: { contains: query.keyword } },
      ]
    }
    if (query.role) where.role = query.role
    if (query.organizationId) {
      where.userOrgs = { some: { organizationId: query.organizationId } }
    }

    const [total, list] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          realName: true,
          role: true,
          studentNo: true,
          phone: true,
          email: true,
          isActive: true,
          createdAt: true,
          userOrgs: {
            select: {
              organization: { select: { id: true, name: true, level: true } },
            },
          },
        },
      }),
    ])

    return { total, list, page, pageSize }
  }

  async findOne(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        username: true,
        realName: true,
        role: true,
        studentNo: true,
        phone: true,
        email: true,
        isActive: true,
        createdAt: true,
        userOrgs: {
          select: {
            organization: { select: { id: true, name: true, level: true } },
          },
        },
      },
    })
    if (!user) throw new NotFoundException('用户不存在')
    return user
  }

  async create(tenantId: string, dto: CreateUserDto, callerRole: UserRole) {
    const targetRole = dto.role ?? UserRole.STUDENT
    // 只能创建层级低于自己的角色
    if (ROLE_LEVEL[targetRole] >= ROLE_LEVEL[callerRole]) {
      throw new ForbiddenException('只能创建层级低于自身的角色')
    }
    // TENANT_ADMIN 每机构唯一
    if (targetRole === UserRole.TENANT_ADMIN) {
      const existing = await this.prisma.user.findFirst({ where: { tenantId, role: UserRole.TENANT_ADMIN } })
      if (existing) throw new ConflictException('机构管理员已存在，每机构只允许一个')
    }

    const exists = await this.prisma.user.findFirst({
      where: { username: dto.username, tenantId },
    })
    if (exists) throw new ConflictException('用户名已存在')

    const hashed = await bcrypt.hash(dto.password, 10)

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId,
          username: dto.username,
          password: hashed,
          realName: dto.realName,
          role: dto.role ?? UserRole.STUDENT,
          studentNo: dto.studentNo,
          phone: dto.phone,
          email: dto.email,
        },
      })
      if (dto.organizationId) {
        await tx.userOrg.create({
          data: { userId: user.id, organizationId: dto.organizationId },
        })
      }
      return user
    })
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto, callerRole: UserRole) {
    const target = await this._findOrFail(tenantId, id)
    // 不能修改层级不低于自己的用户
    if (ROLE_LEVEL[target.role] >= ROLE_LEVEL[callerRole]) {
      throw new ForbiddenException('无权修改同级或更高级别用户')
    }
    // 如果要修改角色，目标角色也必须低于自己
    if (dto.role && ROLE_LEVEL[dto.role] >= ROLE_LEVEL[callerRole]) {
      throw new ForbiddenException('只能将角色设置为低于自身的层级')
    }

    const { organizationId, ...rest } = dto

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id }, data: rest })
      if (organizationId !== undefined) {
        await tx.userOrg.deleteMany({ where: { userId: id } })
        if (organizationId) {
          await tx.userOrg.create({
            data: { userId: id, organizationId },
          })
        }
      }
      return user
    })
  }

  async remove(tenantId: string, id: string, callerRole: UserRole) {
    const target = await this._findOrFail(tenantId, id)
    if (ROLE_LEVEL[target.role] >= ROLE_LEVEL[callerRole]) {
      throw new ForbiddenException('无权删除同级或更高级别用户')
    }
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    })
  }

  async batchRemove(tenantId: string, ids: string[]) {
    return this.prisma.user.updateMany({
      where: { id: { in: ids }, tenantId },
      data: { isActive: false },
    })
  }

  async resetPassword(tenantId: string, id: string, newPassword: string) {
    await this._findOrFail(tenantId, id)
    const hashed = await bcrypt.hash(newPassword, 10)
    return this.prisma.user.update({ where: { id }, data: { password: hashed } })
  }

  async batchImport(tenantId: string, rows: ImportUserDto[]) {
    const results = { success: 0, failed: 0, errors: [] as string[] }

    for (const row of rows) {
      try {
        const exists = await this.prisma.user.findFirst({
          where: { username: row.username, tenantId },
        })
        if (exists) {
          results.failed++
          results.errors.push(`用户名"${row.username}"已存在`)
          continue
        }

        const password = row.password ?? '123456'
        const hashed = await bcrypt.hash(password, 10)

        let orgId: string | undefined
        if (row.organizationName) {
          const org = await this.prisma.organization.findFirst({
            where: { name: row.organizationName, tenantId, isActive: true },
          })
          if (org) orgId = org.id
        }

        await this.prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              tenantId,
              username: row.username,
              password: hashed,
              realName: row.realName,
              role: row.role ?? UserRole.STUDENT,
              studentNo: row.studentNo,
              phone: row.phone,
            },
          })
          if (orgId) {
            await tx.userOrg.create({ data: { userId: user.id, organizationId: orgId } })
          }
        })

        results.success++
      } catch {
        results.failed++
        results.errors.push(`"${row.username}"导入失败`)
      }
    }

    return results
  }

  private async _findOrFail(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: { id: true, role: true, username: true },
    })
    if (!user) throw new NotFoundException('用户不存在')
    return user
  }
}
