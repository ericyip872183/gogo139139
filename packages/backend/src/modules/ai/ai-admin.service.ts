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
  GenerateImageDto,
} from './dto/ai-admin.dto'
import { Response } from 'express'

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
    const data = {
      ...dto,
      type: dto.type || 'chat',
      isEnabled: dto.isEnabled ?? true,
    }
    return this.prisma.aiModel.create({
      data,
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

    // 获取模型信息，使用实际的 modelId 字段（如 doubao-lite-4k）
    const model = await this.prisma.aiModel.findUnique({
      where: { id: modelId },
    })

    if (!model) {
      throw new Error('模型不存在')
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
          model: model.modelId, // 使用实际的模型 ID 字段
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
      const cost = tokensUsed * (model.inputPrice?.toNumber() || 0.001) / 1000

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
          // 根据模型类型使用不同的检测接口
          if (model.type === 'image') {
            // 图片模型：使用图片生成接口检测
            // 火山引擎豆包图片生成专用端点
            const endpoint = `https://ark.cn-beijing.volces.com/api/v3/images/generations`
            console.log(`[图片模型检测] 模型名称：${model.name}`)
            console.log(`[图片模型检测] 数据库 modelId: ${model.modelId}`)
            console.log(`[图片模型检测] 服务商 baseUrl: ${model.provider.baseUrl}`)
            console.log(`[图片模型检测] 使用端点：${endpoint}`)

            const requestBody = {
              model: model.modelId,
              prompt: '一朵红色的玫瑰花，背景简洁，高清写实',
              size: '2048x2048',  // 最小 3686400 像素，2048x2048=4194304 ✅
              response_format: 'url',
              stream: false,
              watermark: false,
            }
            console.log(`[图片模型检测] 请求体：${JSON.stringify(requestBody)}`)

            const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${model.provider.apiKey}`,
              },
              body: JSON.stringify(requestBody),
            })

            const responseBody = await response.text()
            console.log(`[图片模型检测] 状态：${response.status}`)
            console.log(`[图片模型检测] 响应：${responseBody}`)

            const status = response.ok ? 'online' : 'offline'
            await this.prisma.aiModel.update({
              where: { id: model.id },
              data: {
                lastStatus: status,
                lastCheckedAt: new Date(),
                lastError: response.ok ? null : responseBody,
              },
            })

            return {
              id: model.id,
              name: model.name,
              status,
              lastCheckedAt: new Date(),
            }
          } else {
            // 聊天模型：使用聊天接口检测
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
          }
        } catch (error: any) {
          console.error(`[模型检测错误] 模型：${model.name}`, error)

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

  // ─── 流式对话 ───────────────────────────────────────

  /**
   * 流式对话（SSE）
   */
  async chatStream(
    res: Response,
    providerId: string,
    modelId: string,
    message: string,
    mode: 'chat' | 'mock_patient' = 'chat',
  ) {
    const provider = await this.prisma.aiProvider.findUnique({
      where: { id: providerId },
    })

    if (!provider) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: '服务商不存在' }))
      return
    }

    const model = await this.prisma.aiModel.findUnique({
      where: { id: modelId },
    })

    if (!model) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: '模型不存在' }))
      return
    }

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

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    const startTime = Date.now()
    let fullContent = ''
    let totalTokens = 0

    try {
      const response = await fetch(provider.baseUrl + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({
          model: model.modelId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
          temperature: 0.7,
          max_tokens: 2000,
          stream: true, // 启用流式模式
        }),
      })

      if (!response.ok) {
        const errorData = await response.text()
        res.write(`data: ${JSON.stringify({ type: 'error', error: `API 错误：${response.status}` })}\n\n`)
        res.end()
        return
      }

      // 读取流式响应
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: '无法读取响应流' })}\n\n`)
        res.end()
        return
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content || ''
              if (content) {
                fullContent += content
                res.write(`data: ${JSON.stringify({ type: 'content', content })}\n\n`)
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }

      // 计算 tokens（估算）
      totalTokens = Math.ceil(fullContent.length / 4)
      const duration = Date.now() - startTime
      const cost = totalTokens * (model.inputPrice?.toNumber() || 0.001) / 1000

      // 发送完成消息
      res.write(`data: ${JSON.stringify({
        type: 'done',
        duration,
        tokens: totalTokens,
        cost,
      })}\n\n`)
      res.end()

      // 更新模型状态为在线
      await this.prisma.aiModel.update({
        where: { id: modelId },
        data: {
          lastStatus: 'online',
          lastCheckedAt: new Date(),
          lastError: null,
        },
      })
    } catch (error: any) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`)
      res.end()

      // 更新模型状态为离线
      await this.prisma.aiModel.update({
        where: { id: modelId },
        data: {
          lastStatus: 'offline',
          lastCheckedAt: new Date(),
          lastError: error.message,
        },
      })
    }
  }

  // ─── 图片生成 ───────────────────────────────────────

  /**
   * 测试图片生成
   */
  async generateImage(dto: GenerateImageDto & {
    model?: string;
    seed?: number | null;
    negativePrompt?: string;
    referenceImageUrl?: string;
  }) {
    const provider = await this.prisma.aiProvider.findUnique({
      where: { id: dto.providerId },
    })

    if (!provider) {
      throw new BadRequestException('服务商不存在')
    }

    if (!provider.supportImageGeneration) {
      throw new BadRequestException('该服务商不支持图片生成，请先在服务商配置中启用')
    }

    const startTime = Date.now()
    // 火山引擎豆包的图片生成 API 端点
    const endpoint = provider.imageEndpoint || `${provider.baseUrl}/images/generations`

    try {
      // 尺寸映射：火山引擎 Seedream 要求最小 3686400 像素 (1536x2400 或 2048x2048)
      // 参考尺寸：1024x1024=1048576(太小❌), 2048x2048=4194304(✅)
      const sizeMap: Record<string, string> = {
        '2K': '2048x2048',       // 4194304 像素 ✅
        '4K': '4096x4096',       // 16777216 像素 ✅
        '1024x1024': '2048x2048',  // 1024 太小，自动升级到 2048 ✅
        '768x768': '2048x2048',    // 768 太小，自动升级到 2048 ✅
        '1024x1792': '1536x2688',  // 1835008 太小，升级 ✅
        '1792x1024': '2688x1536',  // 1835008 太小，升级 ✅
      }
      const size = sizeMap[dto.size || '1024x1024'] || '2048x2048'

      // 构建请求体（符合火山引擎豆包 API 格式）
      const requestBody: any = {
        model: dto.model || 'ep-20260313201916-mnktm',
        prompt: dto.prompt,
        size: size,
        response_format: 'url',
        stream: false,
        watermark: dto.watermark ?? true,
      }

      // 添加可选参数
      if (dto.seed !== undefined && dto.seed !== null) {
        requestBody.seed = dto.seed
      }

      if (dto.negativePrompt && dto.negativePrompt.trim()) {
        requestBody.negative_prompt = dto.negativePrompt
      }

      if (dto.referenceImageUrl && dto.referenceImageUrl.trim()) {
        requestBody.reference_image_url = dto.referenceImageUrl
      }

      console.log('[图片生成] 请求:', JSON.stringify(requestBody))

      // 生图接口需要较长时间，设置 60 秒超时
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 90000)  // 90 秒超时

      let response
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${provider.apiKey}`,
          },
          body: JSON.stringify(requestBody),
        })
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        throw fetchError
      }

      clearTimeout(timeoutId)

      const duration = Date.now() - startTime

      if (!response.ok) {
        const errorData = await response.text()
        console.error('[图片生成] API 错误:', {
          status: response.status,
          endpoint,
          requestBody: JSON.stringify(requestBody),
          error: errorData,
        })
        throw new BadRequestException(`API 错误：${response.status} - ${errorData}`)
      }

      const data = await response.json()
      console.log('[图片生成] 响应:', data)

      // 适配不同服务商的响应格式
      const images = data.data?.map((img: any) => ({
        url: img.url || img.image?.url,
        revisedPrompt: img.revised_prompt,
      })) || []

      // 计算成本（按张数计算，默认 0.044 元/张）
      const cost = images.length * 0.044

      return {
        success: true,
        images,
        duration,
        cost,
      }
    } catch (error: any) {
      // 判断是否是超时错误
      if (error.name === 'AbortError') {
        console.error('[图片生成] 请求超时（60 秒），生图可能需要更长时间')
        return {
          success: false,
          error: '请求超时（60 秒），生图可能需要更长时间，请重试',
          duration: Date.now() - startTime,
        }
      }
      console.error('图片生成异常:', error)
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      }
    }
  }
}
