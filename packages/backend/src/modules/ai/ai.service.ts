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
   * 对话接口（模拟病人）
   */
  async chat(tenantId: string, userId: string, dto: ChatDto) {
    const config = await this.getConfig(tenantId)
    if (!config || !config.isEnabled) {
      throw new BadRequestException('AI 功能未启用')
    }

    const startTime = Date.now()

    // TODO: 调用火山引擎豆包大模型 API
    // const response = await fetch(config.endpoint, { ... })

    // 模拟响应（临时）
    const mockResponse = {
      message: `【模拟病人】我是一个病人，现在感觉${dto.context || '不太舒服'}。请详细描述您的症状，我会配合回答。`,
      tokens: 50,
    }

    const duration = Date.now() - startTime
    const cost = mockResponse.tokens * 0.000004 // 假设每 token 0.000004 元

    // 记录使用日志
    await this.prisma.aiUsage.create({
      data: {
        tenantId,
        userId,
        module: 'mock_patient',
        tokensUsed: mockResponse.tokens,
        cost,
        request: JSON.stringify({ message: dto.message, context: dto.context }),
        response: JSON.stringify({ message: mockResponse.message }),
        duration,
        status: 'success',
      },
    })

    return mockResponse
  }

  /**
   * OCR 识别（试题录入）
   */
  async ocr(tenantId: string, userId: string, dto: OcrDto) {
    const config = await this.getConfig(tenantId)
    if (!config || !config.isEnabled) {
      throw new BadRequestException('AI 功能未启用')
    }

    const startTime = Date.now()

    // TODO: 调用火山引擎 OCR API
    // const response = await fetch(config.endpoint, { ... })

    // 模拟响应（临时）
    const mockResponse = {
      text: '这是一道关于中医诊断学的选择题...\nA. 阴阳表里\nB. 气血津液\nC. 五行生克\nD. 脏腑经络',
      tokens: 100,
    }

    const duration = Date.now() - startTime
    const cost = mockResponse.tokens * 0.000004

    // 记录使用日志
    await this.prisma.aiUsage.create({
      data: {
        tenantId,
        userId,
        module: 'ocr',
        tokensUsed: mockResponse.tokens,
        cost,
        request: JSON.stringify({ imageUrl: dto.imageUrl }),
        response: JSON.stringify({ text: mockResponse.text }),
        duration,
        status: 'success',
      },
    })

    return mockResponse
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
        amount,
        tokens: Math.floor(amount * 250000), // 假设 1 元=250000 tokens
        orderNo,
        status: 'pending',
        // payUrl,
      },
    })
  }
}
