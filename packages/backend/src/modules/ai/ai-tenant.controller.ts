import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AiAdminService } from './ai-admin.service'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateRechargeDto, RequestQuotaDto } from './dto/ai-admin.dto'

/**
 * AI 服务中心控制器（机构管理员使用）
 */
@Controller('ai/tenant')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AiTenantController {
  constructor(
    private service: AiAdminService,
    private prisma: PrismaService,
  ) {}

  // ─── 获取本机构配置（只读）────────────────────────────────

  /**
   * 获取本机构可用服务
   */
  @Get('services')
  @Roles('TENANT_ADMIN', 'CLASS_ADMIN', 'TEACHER')
  async getTenantServices(@CurrentUser() user: { tenantId: string }) {
    const models = await this.service.getTenantModels(user.tenantId)

    // 按服务商分组
    const services: Record<string, any> = {}

    for (const tm of models) {
      const pid = tm.providerId
      if (!services[pid]) {
        services[pid] = {
          provider: tm.model.provider,
          models: [],
        }
      }

      services[pid].models.push({
        id: tm.model.id,
        name: tm.model.name,
        modelId: tm.model.modelId,
        scene: tm.scene,
        isDefault: tm.isDefault,
      })
    }

    // 获取配额
    const quotas = await this.prisma.tenantAiQuota.findMany({
      where: { tenantId: user.tenantId, isEnabled: true },
      include: {
        provider: {
          select: { id: true, name: true },
        },
      },
    })

    return {
      services: Object.values(services),
      quotas,
    }
  }

  /**
   * 获取本机构使用统计
   */
  @Get('stats')
  @Roles('TENANT_ADMIN', 'CLASS_ADMIN', 'TEACHER')
  async getTenantStats(
    @CurrentUser() user: { tenantId: string },
    @Query('days') days?: string,
  ) {
    return this.service.getTenantStats(user.tenantId, days ? parseInt(days) : 30)
  }

  // ─── 充值管理 ───────────────────────────────────────────

  /**
   * 创建充值订单
   */
  @Post('recharge')
  @Roles('TENANT_ADMIN', 'CLASS_ADMIN')
  async createRecharge(
    @CurrentUser() user: { tenantId: string; id: string },
    @Body() dto: CreateRechargeDto,
  ) {
    const orderNo = `AI${Date.now()}${Math.random().toString(36).slice(2, 8)}`

    // 1 元 = 250000 tokens（参考汇率）
    const tokens = Math.floor(dto.amount * 250000)

    return this.prisma.aiRecharge.create({
      data: {
        tenantId: user.tenantId,
        providerId: dto.providerId,
        amount: dto.amount,
        tokens,
        orderNo,
        status: 'pending',
      },
    })
  }

  /**
   * 获取充值记录
   */
  @Get('recharges')
  @Roles('TENANT_ADMIN', 'CLASS_ADMIN', 'TEACHER')
  async getRecharges(
    @CurrentUser() user: { tenantId: string },
    @Query('status') status?: string,
  ) {
    const where: any = { tenantId: user.tenantId }
    if (status) where.status = status

    return this.prisma.aiRecharge.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
  }

  // ─── 配额申请 ───────────────────────────────────────────

  /**
   * 申请增加配额
   */
  @Post('quota-request')
  @Roles('TENANT_ADMIN', 'CLASS_ADMIN')
  async requestQuota(
    @CurrentUser() user: { tenantId: string; id: string },
    @Body() dto: RequestQuotaDto,
  ) {
    // 创建申请记录（实际应用中应通知超管）
    return this.prisma.aiAlert.create({
      data: {
        tenantId: user.tenantId,
        providerId: dto.providerId,
        remainingPercent: -1, // 负数表示申请
        status: 'quota_request',
      },
    })
  }

  /**
   * 获取本机构预警
   */
  @Get('alerts')
  @Roles('TENANT_ADMIN', 'CLASS_ADMIN')
  async getTenantAlerts(@CurrentUser() user: { tenantId: string }) {
    return this.prisma.aiAlert.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
    })
  }
}
