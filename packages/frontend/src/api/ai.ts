import request from './request'

export interface AiUsageRecord {
  id: string
  module: string
  tokensUsed: number
  cost: number
  duration: number
  status: string
  createdAt: string
}

export interface AiUsageStats {
  usage: Array<{
    module: string
    _sum: { tokensUsed: number; cost: number }
    _count: number
  }>
  recharge: {
    _sum: { amount: number; tokens: number }
    _count: number
  }
}

export const aiApi = {
  // 对话（模拟病人）
  chat: (data: { message: string; context?: string; role?: string }) =>
    request.post('/ai/chat', data),

  // OCR 识别
  ocr: (data: { imageUrl: string }) =>
    request.post('/ai/ocr', data),

  // 获取使用统计
  getUsage: (days?: number) =>
    request.get<AiUsageStats>('/ai/usage', { params: { days } }),

  // 创建充值订单
  createRecharge: (amount: number) =>
    request.post('/ai/recharge', { amount }),

  // 获取配置
  getConfig: () => request.get('/ai/config'),

  // 保存配置
  saveConfig: (data: { apiKey: string; endpoint: string; model: string }) =>
    request.post('/ai/config', data),
}
