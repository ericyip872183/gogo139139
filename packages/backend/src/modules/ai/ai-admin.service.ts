import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { ChatDto, OcrDto } from './dto/ai.dto'
import {
  CreateProviderDto,
  UpdateProviderDto,
  CreateModelDto,
  UpdateModelDto,
  SetTenantModelDto,
  AllocateQuotaDto,
} from './dto/ai-admin.dto'

/**
 * AI 平台管理服务（超管专属）
 */
@Injectable()
export class AiAdminService {
  constructor(private prisma: PrismaService) {}

  // ─── AI 服务商管理 ───────────────────────────────────────

  /**
   * 获取所有服务商
   */
  async getProviders() {
    return this.prisma.aiProvider.findMany({
      include: {
        _count: { select: { models: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * 获取单个服务商
   */
  async getProvider(id: string) {
    return this.prisma.aiProvider.findUnique({
      where: { id },
      include: {
        models: true,
      },
    })
  }

  /**
   * 创建服务商
   */
  async createProvider(dto: CreateProviderDto) {
    return this.prisma.aiProvider.create({
      data: dto,
    })
  }

  /**
   * 更新服务商
   */
  async updateProvider(id: string, dto: UpdateProviderDto) {
    return this.prisma.aiProvider.update({
      where: { id },
      data: dto,
    })
  }

  /**
   * 删除服务商
   */
  async deleteProvider(id: string) {
    return this.prisma.aiProvider.delete({
      where: { id },
    })
  }

  // ─── AI 模型管理（全局模型池）──────────────────────────────

  /**
   * 获取所有模型
   */
  async getModels(providerId?: string) {
    const where = providerId ? { providerId } : {}

    return this.prisma.aiModel.findMany({
      where,
      include: {
        provider: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * 创建模型
   */
  async createModel(dto: CreateModelDto) {
    return this.prisma.aiModel.create({
      data: dto,
    })
  }

  /**
   * 更新模型
   */
  async updateModel(id: string, dto: UpdateModelDto) {
    return this.prisma.aiModel.update({
      where: { id },
      data: dto,
    })
  }

  /**
   * 删除模型
   */
  async deleteModel(id: string) {
    return this.prisma.aiModel.delete({
      where: { id },
    })
  }

  // ─── 机构模型配置（超管专属）──────────────────────────────

  /**
   * 获取机构的模型配置
   */
  async getTenantModels(tenantId: string) {
    return this.prisma.tenantAiModel.findMany({
      where: { tenantId, isEnabled: true },
      include: {
        model: {
          include: {
            provider: true,
          },
        },
      },
    })
  }

  /**
   * 为机构设置模型
   */
  async setTenantModel(dto: SetTenantModelDto) {
    // 检查配额是否存在
    const quota = await this.prisma.tenantAiQuota.findUnique({
      where: {
        tenantId_providerId: {
          tenantId: dto.tenantId,
          providerId: dto.providerId,
        },
      },
    })

    if (!quota) {
      throw new BadRequestException('该机构未开通此服务，请先分配配额')
    }

    // 如果设置为默认模型，先取消该场景其他默认
    if (dto.isDefault) {
      await this.prisma.tenantAiModel.updateMany({
        where: {
          tenantId: dto.tenantId,
          providerId: dto.providerId,
          scene: dto.scene,
          isDefault: true,
        },
        data: { isDefault: false },
      })
    }

    return this.prisma.tenantAiModel.upsert({
      where: {
        tenantId_providerId_modelId_scene: {
          tenantId: dto.tenantId,
          providerId: dto.providerId,
          modelId: dto.modelId,
          scene: dto.scene,
        },
      },
      update: {
        isEnabled: dto.isEnabled,
        isDefault: dto.isDefault,
      },
      create: dto,
    })
  }

  /**
   * 移除机构模型
   */
  async removeTenantModel(tenantId: string, providerId: string, modelId: string, scene: string) {
    return this.prisma.tenantAiModel.delete({
      where: {
        tenantId_providerId_modelId_scene: {
          tenantId,
          providerId,
          modelId,
          scene,
        },
      },
    })
  }

  // ─── 配额管理 ───────────────────────────────────────────

  /**
   * 获取平台总配额
   */
  async getPlatformQuotas() {
    const quotas = await this.prisma.tenantAiQuota.groupBy({
      by: ['providerId'],
      _sum: {
        totalQuota: true,
        usedQuota: true,
      },
    })

    const providers = await this.prisma.aiProvider.findMany({
      select: { id: true, name: true },
    })

    return quotas.map((q) => ({
      providerId: q.providerId,
      providerName: providers.find((p) => p.id === q.providerId)?.name || '',
      totalQuota: q._sum.totalQuota || 0,
      usedQuota: q._sum.usedQuota || 0,
      remainingQuota: (q._sum.totalQuota || 0) - (q._sum.usedQuota || 0),
    }))
  }

  /**
   * 分配配额给机构
   */
  async allocateQuota(dto: AllocateQuotaDto) {
    return this.prisma.tenantAiQuota.upsert({
      where: {
        tenantId_providerId: {
          tenantId: dto.tenantId,
          providerId: dto.providerId,
        },
      },
      update: {
        totalQuota: dto.totalQuota,
        alertThreshold: dto.alertThreshold,
      },
      create: dto,
    })
  }

  /**
   * 获取机构配额
   */
  async getTenantQuota(tenantId: string, providerId: string) {
    return this.prisma.tenantAiQuota.findUnique({
      where: {
        tenantId_providerId: { tenantId, providerId },
      },
    })
  }

  /**
   * 获取所有机构配额
   */
  async getTenantQuotas(tenantId?: string) {
    const where = tenantId ? { tenantId } : {}

    return this.prisma.tenantAiQuota.findMany({
      where,
      include: {
        provider: {
          select: { id: true, name: true },
        },
      },
    })
  }

  // ─── 预警管理 ───────────────────────────────────────────

  /**
   * 获取预警记录
   */
  async getAlerts(tenantId?: string, status?: string) {
    const where: any = {}
    if (tenantId) where.tenantId = tenantId
    if (status) where.status = status

    return this.prisma.aiAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * 标记预警为已处理
   */
  async resolveAlert(id: string) {
    return this.prisma.aiAlert.update({
      where: { id },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
      },
    })
  }

  // ─── 使用统计 ───────────────────────────────────────────

  /**
   * 获取平台使用统计
   */
  async getPlatformStats(days: number = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const [usage, recharge] = await Promise.all([
      this.prisma.aiUsage.groupBy({
        by: ['providerId', 'module'],
        where: { createdAt: { gte: startDate } },
        _sum: { tokensUsed: true, cost: true, inputTokens: true, outputTokens: true },
        _count: true,
      }),
      this.prisma.aiRecharge.aggregate({
        where: { createdAt: { gte: startDate } },
        _sum: { amount: true, tokens: true },
        _count: true,
      }),
    ])

    return {
      usage,
      recharge,
    }
  }

  /**
   * 获取机构使用统计
   */
  async getTenantStats(tenantId: string, days: number = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const [usage, recharge] = await Promise.all([
      this.prisma.aiUsage.groupBy({
        by: ['providerId', 'module'],
        where: { tenantId, createdAt: { gte: startDate } },
        _sum: { tokensUsed: true, cost: true },
        _count: true,
      }),
      this.prisma.aiRecharge.aggregate({
        where: { tenantId, createdAt: { gte: startDate } },
        _sum: { amount: true, tokens: true },
        _count: true,
      }),
    ])

    return {
      usage,
      recharge,
    }
  }

  /**
   * 按日期统计（用于图表）
   */
  async getStatsByDate(tenantId: string, days: number = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    return this.prisma.aiUsage.groupBy({
      by: ['providerId'],
      where: { tenantId, createdAt: { gte: startDate } },
      _sum: { tokensUsed: true, cost: true },
      _count: true,
    })
  }
}
