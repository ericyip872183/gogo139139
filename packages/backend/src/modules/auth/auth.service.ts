import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../../prisma/prisma.service'
import { LoginDto, SendCodeDto, LoginByCodeDto, ResetPasswordDto } from './dto/login.dto'
import { CodeService } from './code.service'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private codeService: CodeService,
  ) {}

  // ─── 账号密码登录 ─────────────────────────────────────

  async login(dto: LoginDto) {
    const tenant = await this.resolveTenant(dto.tenantCode)
    const user = await this.prisma.user.findFirst({
      where: { tenantId: tenant.id, username: dto.username, isActive: true, isDeleted: false },
    })
    if (!user) throw new UnauthorizedException('用户名或密码错误')
    const valid = await bcrypt.compare(dto.password, user.password)
    if (!valid) throw new UnauthorizedException('用户名或密码错误')
    return this.buildToken(user, tenant)
  }

  // ─── 发送验证码 ───────────────────────────────────────

  async sendCode(dto: SendCodeDto) {
    const tenant = await this.resolveTenant(dto.tenantCode)
    const { contact, purpose } = dto

    // 验证 contact 格式
    const isEmail = this.codeService.isEmail(contact)
    const isPhone = this.codeService.isPhone(contact)
    if (!isEmail && !isPhone) {
      throw new BadRequestException('请输入有效的手机号或邮箱')
    }

    // 查找该机构下绑定了此联系方式的用户
    const field = isEmail ? { email: contact } : { phone: contact }
    const user = await this.prisma.user.findFirst({
      where: { tenantId: tenant.id, isActive: true, isDeleted: false, ...field },
    })
    if (!user) {
      throw new BadRequestException('该机构下未找到绑定此手机/邮箱的用户')
    }

    // 频率限制
    const rateKey = `${tenant.id}:${contact}:${purpose}`
    await this.codeService.checkRateLimit(rateKey)

    // 生成并发送
    const code = await this.codeService.generate(rateKey)
    const label = purpose === 'login' ? '登录' : '重置密码'
    if (isEmail) {
      await this.codeService.sendEmail(contact, code, label)
    } else {
      await this.codeService.sendSms(contact, code, label)
    }

    return { message: `验证码已发送至 ${isEmail ? '邮箱' : '手机'}` }
  }

  // ─── 验证码登录 ───────────────────────────────────────

  async loginByCode(dto: LoginByCodeDto) {
    const tenant = await this.resolveTenant(dto.tenantCode)
    const { contact } = dto

    const isEmail = this.codeService.isEmail(contact)
    const isPhone = this.codeService.isPhone(contact)
    if (!isEmail && !isPhone) throw new BadRequestException('手机号或邮箱格式不正确')

    const rateKey = `${tenant.id}:${contact}:login`
    await this.codeService.verify(rateKey, dto.code)

    const field = isEmail ? { email: contact } : { phone: contact }
    const user = await this.prisma.user.findFirst({
      where: { tenantId: tenant.id, isActive: true, isDeleted: false, ...field },
    })
    if (!user) throw new UnauthorizedException('用户不存在')

    return this.buildToken(user, tenant)
  }

  // ─── 重置密码 ─────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto) {
    const tenant = await this.resolveTenant(dto.tenantCode)
    const { contact } = dto

    const isEmail = this.codeService.isEmail(contact)
    const isPhone = this.codeService.isPhone(contact)
    if (!isEmail && !isPhone) throw new BadRequestException('手机号或邮箱格式不正确')

    const rateKey = `${tenant.id}:${contact}:reset`
    await this.codeService.verify(rateKey, dto.code)

    const field = isEmail ? { email: contact } : { phone: contact }
    const user = await this.prisma.user.findFirst({
      where: { tenantId: tenant.id, isActive: true, isDeleted: false, ...field },
    })
    if (!user) throw new BadRequestException('用户不存在')

    const hash = await bcrypt.hash(dto.newPassword, 10)
    await this.prisma.user.update({ where: { id: user.id }, data: { password: hash } })
    return { message: '密码重置成功，请用新密码登录' }
  }

  // ─── 按用户名查询所属机构列表 ───────────────────────────
  async lookupByUsername(username: string) {
    if (!username) return []
    const users = await this.prisma.user.findMany({
      where: { username, isActive: true, isDeleted: false },
      select: { tenant: { select: { name: true, code: true } } },
    })
    return users.map(u => u.tenant)
  }

  // ─── 按手机/邮箱查询所属机构列表 ─────────────────────────
  async lookupByContact(contact: string) {
    if (!contact) return []
    const isEmail = this.codeService.isEmail(contact)
    const isPhone = this.codeService.isPhone(contact)
    if (!isEmail && !isPhone) return []
    const field = isEmail ? { email: contact } : { phone: contact }
    const users = await this.prisma.user.findMany({
      where: { isActive: true, isDeleted: false, ...field },
      select: { tenant: { select: { name: true, code: true } } },
    })
    return users.map(u => u.tenant)
  }

  // ─── 获取本机构已购模块 ────────────────────────────────

  async getMyModules(tenantId: string) {
    const rows = await this.prisma.tenantModule.findMany({
      where: { tenantId },
      include: { module: { select: { code: true, name: true, phase: true } } },
    })
    return rows.map(r => ({ code: r.module.code, name: r.module.name, phase: r.module.phase }))
  }

  // ─── getProfile ───────────────────────────────────────

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, username: true, realName: true, role: true,
        avatar: true, phone: true, email: true, studentNo: true,
        lastLoginAt: true,
        tenant: { select: { id: true, name: true, logo: true } },
      },
    })
    if (!user) throw new UnauthorizedException('用户不存在')
    return user
  }

  // ─── 工具 ─────────────────────────────────────────────

  private async resolveTenant(code: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { code } })
    if (!tenant || !tenant.isActive) throw new BadRequestException('机构不存在或已禁用')
    if (tenant.expiredAt && tenant.expiredAt < new Date()) {
      throw new BadRequestException('机构授权已到期，请联系管理员')
    }
    return tenant
  }

  private async buildToken(user: any, tenant: any) {
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    const token = this.jwt.sign({ sub: user.id, tenantId: user.tenantId, role: user.role })
    return {
      token,
      user: {
        id: user.id, username: user.username, realName: user.realName,
        role: user.role, avatar: user.avatar,
        tenantId: user.tenantId, tenantName: tenant.name,
      },
    }
  }
}
