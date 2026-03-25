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
    // 处理默认值
    const data = {
      ...dto,
      authType: dto.authType || 'Bearer',
      isEnabled: dto.isEnabled ?? true,
    }
    return this.prisma.aiProvider.create({
      data,
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

  // ─── 模型测试与状态检测 ───────────────────────────────────────

  /**
   * 测试模型连接
   */
  async testModel(providerId: string, modelId: string, message: string, mode: 'chat' | 'mock_patient' = 'chat') {
    const provider = await this.prisma.aiProvider.findUnique({
      where: { id: providerId },
    })

    if (!provider) {
      throw new Error('服务商不存在')
    }

    const startTime = Date.now()

    // 构建 system prompt
    let systemPrompt = '你是一个有帮助的 AI 助手。'
    if (mode === 'mock_patient') {
      systemPrompt = `你是一名标准化病人（SP），正在配合医学生进行问诊练习。
- 你是一位 45 岁左右的中年人
- 主诉：反复胃脘部隐痛 3 个月
- 现病史：3 个月前因饮食不规律出现胃脘部隐痛，喜温喜按，进食后缓解，空腹时加重
- 伴随症状：神疲乏力，食欲不振，大便溏薄
- 舌脉：舌淡苔白，脉细弱
- 请以患者口吻回答，描述症状，不要直接说出中医诊断
- 回答要口语化，像真实病人一样`
    }

    try {
      const response = await fetch(provider.baseUrl + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      })

      const duration = Date.now() - startTime

      if (!response.ok) {
        const errorData = await response.text()
        // 更新模型状态为错误
        await this.prisma.aiModel.update({
          where: { id: modelId },
          data: {
            lastStatus: 'error',
            lastCheckedAt: new Date(),
            lastError: `HTTP ${response.status}: ${errorData}`,
          },
        })

        return {
          success: false,
          error: `API 错误：${response.status}`,
          duration,
        }
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || '无回复内容'
      const tokensUsed = data.usage?.total_tokens || 0

      // 计算成本
      const model = await this.prisma.aiModel.findUnique({
        where: { id: modelId },
      })
      const cost = tokensUsed * (model?.inputPrice?.toNumber() || 0.001) / 1000

      // 更新模型状态为在线
      await this.prisma.aiModel.update({
        where: { id: modelId },
        data: {
          lastStatus: 'online',
          lastCheckedAt: new Date(),
          lastError: null,
        },
      })

      return {
        success: true,
        content,
        tokens: tokensUsed,
        duration,
        cost,
      }
    } catch (error: any) {
      const duration = Date.now() - startTime

      // 更新模型状态为离线
      await this.prisma.aiModel.update({
        where: { id: modelId },
        data: {
          lastStatus: 'offline',
          lastCheckedAt: new Date(),
          lastError: error.message,
        },
      })

      return {
        success: false,
        error: error.message,
        duration,
      }
    }
  }

  /**
   * 获取模型状态
   */
  async getModelStatus(modelId: string) {
    const model = await this.prisma.aiModel.findUnique({
      where: { id: modelId },
      select: {
        id: true,
        name: true,
        lastStatus: true,
        lastCheckedAt: true,
        lastError: true,
      },
    })

    return model
  }

  /**
   * 批量检测所有模型状态
   */
  async checkAllModels() {
    const models = await this.prisma.aiModel.findMany({
      where: { isEnabled: true },
      include: {
        provider: true,
      },
    })

    const results = await Promise.all(
      models.map(async (model) => {
        const startTime = Date.now()
        try {
          const response = await fetch(model.provider.baseUrl + '/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${model.provider.apiKey}`,
            },
            body: JSON.stringify({
              model: model.modelId,
              messages: [{ role: 'user', content: 'Hello' }],
              max_tokens: 10,
            }),
          })

          const status = response.ok ? 'online' : 'offline'
          await this.prisma.aiModel.update({
            where: { id: model.id },
            data: {
              lastStatus: status,
              lastCheckedAt: new Date(),
              lastError: response.ok ? null : await response.text(),
            },
          })

          return {
            id: model.id,
            name: model.name,
            status,
            lastCheckedAt: new Date(),
          }
        } catch (error: any) {
          await this.prisma.aiModel.update({
            where: { id: model.id },
            data: {
              lastStatus: 'offline',
              lastCheckedAt: new Date(),
              lastError: error.message,
            },
          })

          return {
            id: model.id,
            name: model.name,
            status: 'offline',
            lastCheckedAt: new Date(),
            error: error.message,
          }
        }
      }),
    )

    return results
  }
}
