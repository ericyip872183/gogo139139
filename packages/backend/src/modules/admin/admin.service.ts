import { Injectable, NotFoundException, ConflictException, OnModuleInit } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateTenantDto, UpdateTenantDto, CreateModuleDto, GrantModuleDto, CreateTenantAdminDto } from './dto/admin.dto'

// 系统预置的8个专业模块（不可删除，超管只能授权/撤销）
const PRESET_MODULES = [
  { code: 'TCM_CONSTITUTION', name: '体质辨识教学', description: '11套标准化问卷，9种体质辨识，体质雷达图可视化，60+证型辨识，调养建议输出', phase: '二期' },
  { code: 'TCM_EAR', name: '耳穴教学', description: 'OSCE标准化考核，耳穴埋籽全流程操作，3D耳廓模型展示穴位，四诊合参训练', phase: '二期' },
  { code: 'TCM_MERIDIAN', name: '经络采集分析', description: '十二经络电信号实时采集，多维度诊断报告，硬件设备实时对接', phase: '三期' },
  { code: 'TCM_FOURDIAG', name: '中医四诊采集分析', description: '舌诊3D解剖/面诊/脉诊/闻诊/问诊智能分析，四诊合参综合报告', phase: '三期' },
  { code: 'TCM_ACUPUNCTURE', name: '针刺手法采集', description: '智能针灸模拟盒+传感针具，25种手法识别与评分，VR取穴考核', phase: '三期' },
  { code: 'TCM_GUASHA', name: '刮痧手法采集', description: '力反馈机械臂+VR，AI自动评分，竞赛级考核标准（金砖大赛）', phase: '三期' },
  { code: 'TCM_MASSAGE', name: '推拿手法采集', description: '柔性传感器，800+穴位教学库，多端屏幕同步/远程教学管控', phase: '三期' },
  { code: 'TCM_ANATOMY', name: '人体经络腧穴解剖', description: '穴位触控笔+3D模型联动，虚拟针刺仿真，针灸处方练习系统', phase: '三期' },
]

@Injectable()
export class AdminService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  // 启动时自动写入预置模块（upsert 保证幂等）
  async onModuleInit() {
    for (const m of PRESET_MODULES) {
      await this.prisma.module.upsert({
        where: { code: m.code },
        create: { ...m, isActive: true },
        update: { name: m.name, description: m.description, phase: m.phase },
      })
    }
  }

  // ── 机构管理 ──────────────────────────────────────

  async listTenants(keyword?: string) {
    const where: any = {}
    if (keyword) where.OR = [
      { name: { contains: keyword } },
      { code: { contains: keyword } },
    ]
    return this.prisma.tenant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
  }

  async createTenant(dto: CreateTenantDto) {
    const exists = await this.prisma.tenant.findUnique({ where: { code: dto.code } })
    if (exists) throw new ConflictException('机构编码已存在')
    return this.prisma.tenant.create({ data: dto })
  }

  async updateTenant(id: string, dto: UpdateTenantDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } })
    if (!tenant) throw new NotFoundException('机构不存在')
    return this.prisma.tenant.update({ where: { id }, data: dto })
  }

  async createTenantAdmin(tenantId: string, dto: CreateTenantAdminDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) throw new NotFoundException('机构不存在')
    const exists = await this.prisma.user.findFirst({
      where: { username: dto.username, tenantId },
    })
    if (exists) throw new ConflictException('该机构下用户名已存在')
    const hash = await bcrypt.hash(dto.password, 10)
    const uid = `user_${Date.now()}`
    return this.prisma.user.create({
      data: {
        id: uid,
        username: dto.username,
        realName: dto.realName,
        password: hash,
        role: 'TEACHER',
        tenantId,
      },
      select: { id: true, username: true, realName: true, role: true },
    })
  }

  // ── 模块管理 ──────────────────────────────────────

  async listModules() {
    return this.prisma.module.findMany({ orderBy: { createdAt: 'asc' } })
  }

  async createModule(dto: CreateModuleDto) {
    const exists = await this.prisma.module.findUnique({ where: { code: dto.code } })
    if (exists) throw new ConflictException('模块代码已存在')
    return this.prisma.module.create({ data: dto })
  }

  // ── 机构-模块授权 ─────────────────────────────────

  async listTenantModules(tenantId: string) {
    return this.prisma.tenantModule.findMany({
      where: { tenantId },
      include: { module: true },
    })
  }

  async grantModule(tenantId: string, dto: GrantModuleDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) throw new NotFoundException('机构不存在')
    const mod = await this.prisma.module.findUnique({ where: { id: dto.moduleId } })
    if (!mod) throw new NotFoundException('模块不存在')

    return this.prisma.tenantModule.upsert({
      where: { tenantId_moduleId: { tenantId, moduleId: dto.moduleId } },
      create: { tenantId, moduleId: dto.moduleId, expiredAt: dto.expiredAt ? new Date(dto.expiredAt) : null },
      update: { expiredAt: dto.expiredAt ? new Date(dto.expiredAt) : null },
    })
  }

  async revokeModule(tenantId: string, moduleId: string) {
    await this.prisma.tenantModule.deleteMany({ where: { tenantId, moduleId } })
    return { message: '授权已撤销' }
  }

  // ── 平台统计 ──────────────────────────────────────

  async getStats() {
    const [tenantCount, userCount, questionCount, examCount, scoreCount, recordCount] =
      await Promise.all([
        this.prisma.tenant.count(),
        this.prisma.user.count(),
        this.prisma.question.count(),
        this.prisma.exam.count(),
        this.prisma.score.count(),
        this.prisma.scoreRecord.count(),
      ])
    return { tenantCount, userCount, questionCount, examCount, scoreCount, recordCount }
  }

  // ── 超管首页统计 ─────────────────────────────────

  /**
   * 获取超管首页统计数据
   * 包含：机构与模块销售概览、用户统计、最近动态、到期预警
   */
  async getDashboardStats() {
    const now = new Date()
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // 基础统计
    const [
      tenantCount,
      userCount,
      tenantModuleCount,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.user.count(),
      this.prisma.tenantModule.count(),
    ])

    // 用户按角色分布
    const userByRole = await this.prisma.user.groupBy({
      by: ['role'],
      _count: true,
    })

    // 模块销售统计（每个模块售出给多少机构）
    const moduleSalesRaw = await this.prisma.tenantModule.groupBy({
      by: ['moduleId'],
      _count: true,
    })
    const allModules = await this.prisma.module.findMany()
    const moduleMap = new Map(allModules.map(m => [m.id, m.name]))

    // 即将到期的机构（7 天内）
    const expiringTenants = await this.prisma.tenantModule.findMany({
      where: {
        expiredAt: {
          lte: sevenDaysLater,
          gte: now,
        },
      },
      include: {
        tenant: true,
        module: true,
      },
      orderBy: { expiredAt: 'asc' },
      take: 10,
    })

    // 最近新增的机构（最近 30 天）
    const recentTenants = await this.prisma.tenant.findMany({
      where: {
        createdAt: {
          gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // 最近授权记录
    const recentGrants = await this.prisma.tenantModule.findMany({
      where: {
        createdAt: {
          gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        tenant: true,
        module: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return {
      overview: {
        tenantCount,
        userCount,
        moduleInstanceCount: tenantModuleCount, // 模块实例总数（售出份数）
      },
      userByRole: userByRole.reduce((acc, item) => {
        acc[item.role] = item._count
        return acc
      }, {} as Record<string, number>),
      moduleSales: moduleSalesRaw.map(item => ({
        moduleId: item.moduleId,
        moduleName: moduleMap.get(item.moduleId) || '未知模块',
        soldCount: item._count,
      })),
      expiringTenants: expiringTenants.map(item => ({
        tenantName: item.tenant.name,
        moduleName: item.module?.name || '未知模块',
        expiredAt: item.expiredAt,
      })),
      recentTenants: recentTenants.map(item => ({
        name: item.name,
        code: item.code,
        createdAt: item.createdAt,
      })),
      recentGrants: recentGrants.map(item => ({
        tenantName: item.tenant.name,
        moduleName: item.module?.name || '未知模块',
        createdAt: item.createdAt,
      })),
    }
  }
}
