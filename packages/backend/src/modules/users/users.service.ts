import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  StreamableFile,
} from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import * as ExcelJS from 'exceljs'
import type { Worksheet } from 'exceljs'
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
      const orgIds = dto.organizationIds?.length ? dto.organizationIds : dto.organizationId ? [dto.organizationId] : []
      for (const orgId of orgIds) {
        await tx.userOrg.create({ data: { userId: user.id, organizationId: orgId } })
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

    const { organizationId, organizationIds, ...rest } = dto

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id }, data: rest })
      const newOrgIds = organizationIds?.length ? organizationIds : organizationId !== undefined ? (organizationId ? [organizationId] : []) : undefined
      if (newOrgIds !== undefined) {
        await tx.userOrg.deleteMany({ where: { userId: id } })
        for (const orgId of newOrgIds) {
          await tx.userOrg.create({ data: { userId: id, organizationId: orgId } })
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

  // ── 批量激活/停用 ────────────────────────────────────

  async batchStatus(tenantId: string, ids: string[], isActive: boolean) {
    const result = await this.prisma.user.updateMany({
      where: { id: { in: ids }, tenantId },
      data: { isActive },
    })
    return { count: result.count }
  }

  // ── 批量设置密码 ────────────────────────────────────

  async batchPassword(tenantId: string, ids: string[], password: string) {
    const hashed = await bcrypt.hash(password, 10)
    const result = await this.prisma.user.updateMany({
      where: { id: { in: ids }, tenantId },
      data: { password: hashed },
    })
    return { count: result.count }
  }

  // ── Excel 导出 ──────────────────────────────────────

  async exportExcel(tenantId: string, query: QueryUserDto, callerRole: UserRole): Promise<StreamableFile> {
    const q = { ...query, page: 1, pageSize: 10000 }
    const { list } = await this.findAll(tenantId, q, callerRole)

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('用户列表')
    sheet.columns = [
      { header: '用户名', key: 'username', width: 15 },
      { header: '姓名', key: 'realName', width: 15 },
      { header: '角色', key: 'role', width: 12 },
      { header: '学号', key: 'studentNo', width: 15 },
      { header: '手机', key: 'phone', width: 15 },
      { header: '邮箱', key: 'email', width: 20 },
      { header: '所属组织', key: 'organizations', width: 25 },
      { header: '状态', key: 'status', width: 8 },
    ]

    const roleMap: Record<string, string> = {
      SUPER_ADMIN: '超级管理员', TENANT_ADMIN: '机构管理员', SCHOOL: '学校管理员',
      CLASS: '班级管理员', TEACHER: '教师', STUDENT: '学生',
    }

    for (const u of list as any[]) {
      sheet.addRow({
        username: u.username,
        realName: u.realName,
        role: roleMap[u.role] ?? u.role,
        studentNo: u.studentNo ?? '',
        phone: u.phone ?? '',
        email: u.email ?? '',
        organizations: u.userOrgs?.map((o: any) => o.organization.name).join('、') ?? '',
        status: u.isActive ? '正常' : '禁用',
      })
    }

    const buffer = await workbook.xlsx.writeBuffer()
    return new StreamableFile(new Uint8Array(buffer), {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: 'attachment; filename="users.xlsx"',
    })
  }

  // ── Excel 导入 ──────────────────────────────────────

  async importExcel(tenantId: string, fileBuffer: Buffer) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(fileBuffer as any)
    const sheet = workbook.worksheets[0]
    if (!sheet) throw new BadRequestException('Excel 文件为空')

    const rows: ImportUserDto[] = []
    const headerRow = sheet.getRow(1)
    const headers: string[] = []
    headerRow.eachCell((cell: any) => { headers.push(String(cell.value ?? '').trim()) })

    const colMap: Record<string, string> = {
      '用户名': 'username', '姓名': 'realName', '密码': 'password',
      '角色': 'role', '学号': 'studentNo', '手机': 'phone', '组织': 'organizationName',
    }
    const roleReverseMap: Record<string, string> = {
      '超级管理员': 'SUPER_ADMIN', '机构管理员': 'TENANT_ADMIN', '学校管理员': 'SCHOOL',
      '班级管理员': 'CLASS', '教师': 'TEACHER', '学生': 'STUDENT',
    }

    sheet.eachRow((row: any, rowNumber: number) => {
      if (rowNumber === 1) return
      const item: any = {}
      row.eachCell((cell: any, colNumber: number) => {
        const header = headers[colNumber - 1]
        const field = colMap[header]
        if (field) {
          let val = String(cell.value ?? '').trim()
          if (field === 'role') val = roleReverseMap[val] ?? val
          item[field] = val
        }
      })
      if (item.username && item.realName) rows.push(item)
    })

    return this.batchImport(tenantId, rows)
  }

  // ── 个人中心 ────────────────────────────────────

  /**
   * 获取当前用户完整信息（个人中心用）
   */
  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: true,
        userOrgs: { include: { organization: true } },
      },
    })
    if (!user) throw new NotFoundException('用户不存在')
    const { password, ...result } = user
    return result
  }

  /**
   * 修改密码
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('用户不存在')

    const valid = await bcrypt.compare(oldPassword, user.password)
    if (!valid) throw new BadRequestException('原密码错误')

    const hashed = await bcrypt.hash(newPassword, 10)
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    })
    return { message: '密码修改成功' }
  }

  // ── 彻底删除（带关联检查）────────────────────────

  /**
   * 检查用户是否可以被彻底删除
   */
  async checkCanDelete(userId: string) {
    const [examAnswers, scoreRecords, asJudge] = await Promise.all([
      this.prisma.examAnswer.findFirst({ where: { userId } }),
      this.prisma.scoreRecord.findFirst({ where: { targetId: userId } }),
      this.prisma.scoreRecord.findFirst({ where: { judgeId: userId } }),
    ])

    const reasons: string[] = []
    if (examAnswers) reasons.push('该用户参加过考试')
    if (scoreRecords) reasons.push('该用户有评分记录')
    if (asJudge) reasons.push('该用户作为考官打过分')

    return { canDelete: reasons.length === 0, reasons }
  }

  /**
   * 彻底删除用户（物理删除）
   */
  async forceDelete(tenantId: string, id: string, callerRole: UserRole) {
    const target = await this._findOrFail(tenantId, id)
    if (ROLE_LEVEL[target.role] >= ROLE_LEVEL[callerRole]) {
      throw new ForbiddenException('无权删除同级或更高级别用户')
    }

    const check = await this.checkCanDelete(id)
    if (!check.canDelete) {
      throw new BadRequestException(`无法彻底删除：${check.reasons.join('，')}`)
    }

    return this.prisma.user.delete({ where: { id } })
  }
}
