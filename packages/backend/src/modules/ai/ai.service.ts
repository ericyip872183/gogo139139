import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { ChatDto, OcrDto } from './dto/ai.dto'

@Injectable()
export class AiService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取机构 AI 配置
   */
  async getConfig(tenantId: string) {
    const config = await this.prisma.aiConfig.findFirst({ where: { tenantId } })
    if (!config) {
      // 返回平台默认配置（超管在后台配置）
      return this.prisma.aiConfig.findFirst({ where: { tenantId: { equals: 'platform' } } })
    }
    return config
  }

  /**
   * 创建 AI 配置
   */
  async createConfig(tenantId: string, config: any) {
    return this.prisma.aiConfig.create({
      data: {
        tenantId,
        apiKey: config.apiKey || '',
        apiSecret: config.apiSecret,
        endpoint: config.endpoint || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
        model: config.model || 'doubao-lite-4k',
        maxTokens: config.maxTokens || 2000,
        isEnabled: config.isEnabled !== false,
        systemPrompt: config.systemPrompt,
      },
    })
  }

  /**
   * 更新 AI 配置
   */
  async updateConfig(tenantId: string, config: any) {
    return this.prisma.aiConfig.update({
      where: { tenantId },
      data: {
        apiKey: config.apiKey !== undefined ? config.apiKey : undefined,
        apiSecret: config.apiSecret !== undefined ? config.apiSecret : undefined,
        endpoint: config.endpoint !== undefined ? config.endpoint : undefined,
        model: config.model !== undefined ? config.model : undefined,
        maxTokens: config.maxTokens !== undefined ? config.maxTokens : undefined,
        isEnabled: config.isEnabled !== undefined ? config.isEnabled : undefined,
        systemPrompt: config.systemPrompt !== undefined ? config.systemPrompt : undefined,
      },
    })
  }

  /**
   * 对话接口（模拟病人）- 火山引擎豆包大模型
   */
  async chat(tenantId: string, userId: string, dto: ChatDto) {
    const config = await this.getConfig(tenantId)
    if (!config || !config.isEnabled) {
      throw new BadRequestException('AI 功能未启用')
    }

    const startTime = Date.now()

    // 构建提示词（模拟病人场景）
    const systemPrompt = config.systemPrompt || `你是一名标准化病人（SP），正在配合医学生进行问诊练习。
- 你是一位 45 岁左右的中年人
- 主诉：反复胃脘部隐痛 3 个月
- 现病史：3 个月前因饮食不规律出现胃脘部隐痛，喜温喜按，进食后缓解，空腹时加重
- 伴随症状：神疲乏力，食欲不振，大便溏薄
- 舌脉：舌淡苔白，脉细弱
- 请以患者口吻回答，描述症状，不要直接说出中医诊断
- 回答要口语化，像真实病人一样`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: dto.message },
    ]

    if (dto.context) {
      messages.unshift({ role: 'system', content: `病史背景：${dto.context}` })
    }

    try {
      // 调用火山引擎豆包大模型 API
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model || 'doubao-pro-4k',
          messages,
          temperature: 0.7,
          max_tokens: config.maxTokens || 2000,
        }),
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new BadRequestException(`火山引擎 API 错误：${response.status} - ${errorData}`)
      }

      const data = await response.json()
      const aiMessage = data.choices?.[0]?.message?.content || '【AI】抱歉，我暂时无法回答。'

      const duration = Date.now() - startTime
      const tokensUsed = data.usage?.total_tokens || 100
      // 根据模型类型计算成本（doubao-pro-4k: 输入 0.0008/千，输出 0.002/千）
      const cost = (tokensUsed / 1000) * 0.002

      // 记录使用日志
      await this.prisma.aiUsage.create({
        data: {
          tenantId,
          userId,
          providerId: 'doubao',
          modelId: config.model || 'doubao-lite-4k',
          module: 'mock_patient',
          action: 'chat',
          tokensUsed,
          cost,
          request: JSON.stringify({ messages }),
          response: JSON.stringify({ content: aiMessage }),
          duration,
          status: 'success',
        },
      })

      return {
        message: aiMessage,
        tokens: tokensUsed,
      }
    } catch (error: any) {
      // 记录失败日志
      await this.prisma.aiUsage.create({
        data: {
          tenantId,
          userId,
          providerId: 'doubao',
          modelId: config.model || 'doubao-lite-4k',
          module: 'mock_patient',
          action: 'chat',
          tokensUsed: 0,
          cost: 0,
          request: JSON.stringify({ messages }),
          response: JSON.stringify({ error: error.message }),
          duration: Date.now() - startTime,
          status: 'failed',
        },
      })

      throw new BadRequestException(`AI 对话失败：${error.message}`)
    }
  }

  /**
   * OCR 识别（试题录入）- 火山引擎 OCR API
   */
  async ocr(tenantId: string, userId: string, dto: OcrDto) {
    const config = await this.getConfig(tenantId)
    if (!config || !config.isEnabled) {
      throw new BadRequestException('AI 功能未启用')
    }

    const startTime = Date.now()

    try {
      // 判断是图片 URL 还是 base64
      let imageBase64 = dto.imageUrl
      if (dto.imageUrl.startsWith('http')) {
        // 如果是 URL，先下载图片
        const imgResponse = await fetch(dto.imageUrl)
        const buffer = await imgResponse.arrayBuffer()
        imageBase64 = Buffer.from(buffer).toString('base64')
      } else if (dto.imageUrl.includes('base64,')) {
        // 去掉 data:image/jpeg;base64, 前缀
        imageBase64 = dto.imageUrl.split('base64,')[1]
      }

      // 调用火山引擎通用 OCR API
      const ocrEndpoint = 'https://ark.cn-beijing.volces.com/api/v3/ocr/general'
      const ocrResponse = await fetch(ocrEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          image: imageBase64,
          detect_direction: false,
          detect_language: false,
        }),
      })

      if (!ocrResponse.ok) {
        const errorData = await ocrResponse.text()
        throw new BadRequestException(`火山引擎 OCR 错误：${ocrResponse.status} - ${errorData}`)
      }

      const ocrData = await ocrResponse.json()

      // 提取文字内容（火山引擎 OCR 返回格式：words_result 数组）
      const text = ocrData.words_result
        ? ocrData.words_result.map((item: any) => item.words).join('\n')
        : '未识别到文字'

      const duration = Date.now() - startTime
      const tokensUsed = ocrData.words_result?.length || 1
      const cost = (tokensUsed / 1000) * 0.00007 // OCR 价格：约 0.00007 元/张

      // 记录使用日志
      await this.prisma.aiUsage.create({
        data: {
          tenantId,
          userId,
          providerId: 'doubao',
          modelId: config.model || 'doubao-lite-4k',
          module: 'ocr',
          action: 'ocr',
          tokensUsed,
          cost,
          request: JSON.stringify({ imageUrl: dto.imageUrl }),
          response: JSON.stringify({ text }),
          duration,
          status: 'success',
        },
      })

      return {
        text,
        tokens: tokensUsed,
      }
    } catch (error: any) {
      // 记录失败日志
      await this.prisma.aiUsage.create({
        data: {
          tenantId,
          userId,
          providerId: 'doubao',
          modelId: config.model || 'doubao-lite-4k',
          module: 'ocr',
          action: 'ocr',
          tokensUsed: 0,
          cost: 0,
          request: JSON.stringify({ imageUrl: dto.imageUrl }),
          response: JSON.stringify({ error: error.message }),
          duration: Date.now() - startTime,
          status: 'failed',
        },
      })

      throw new BadRequestException(`OCR 识别失败：${error.message}`)
    }
  }

  /**
   * 获取使用统计
   */
  async getUsage(tenantId: string, days = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const [usage, recharge] = await Promise.all([
      this.prisma.aiUsage.groupBy({
        by: ['module'],
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
   * 创建充值订单
   */
  async createRecharge(tenantId: string, userId: string, amount: number) {
    const orderNo = `AI${Date.now()}${Math.random().toString(36).slice(2, 8)}`

    // TODO: 调用支付接口生成支付链接
    // const payUrl = await paymentService.createOrder(...)

    return this.prisma.aiRecharge.create({
      data: {
        tenantId,
        providerId: 'doubao',
        amount,
        tokens: Math.floor(amount * 250000),
        orderNo,
        status: 'pending',
      },
    })
  }
}
