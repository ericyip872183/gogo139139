import request from './request'

/**
 * AI 服务商
 */
export interface AiProvider {
  id: string
  name: string
  baseUrl: string
  authType: string
  apiKey: string
  apiSecret?: string
  supportImageGeneration?: boolean
  imageEndpoint?: string
  isEnabled: boolean
  config?: any
  createdAt: string
  _count?: { models: number }
}

/**
 * AI 模型
 */
export interface AiModel {
  id: string
  providerId: string
  name: string
  modelId: string
  type: 'chat' | 'image'  // 模型类型：chat=聊天，image=图片生成
  isEp: boolean
  inputPrice: number
  outputPrice: number
  isEnabled: boolean
  lastStatus?: 'online' | 'offline' | 'error'
  lastCheckedAt?: string
  lastError?: string
  createdAt: string
  provider?: { name: string }
}

/**
 * 模型测试结果
 */
export interface ModelTestResult {
  success: boolean
  content?: string
  tokens?: number
  duration?: number
  cost?: number
  error?: string
}

/**
 * 图片生成结果
 */
export interface ImageGenerationResult {
  success: boolean
  images?: Array<{
    url: string
    revisedPrompt?: string
  }>
  duration?: number
  cost?: number
  error?: string
}

/**
 * 模型状态
 */
export interface ModelStatus {
  id: string
  name: string
  lastStatus: 'online' | 'offline' | 'error'
  lastCheckedAt: string
  lastError?: string
}

/**
 * 机构模型配置
 */
export interface TenantAiModel {
  id: string
  tenantId: string
  providerId: string
  modelId: string
  scene: string
  isDefault: boolean
  isEnabled: boolean
  model: AiModel & { provider: AiProvider }
}

/**
 * 机构配额
 */
export interface TenantAiQuota {
  id: string
  tenantId: string
  providerId: string
  totalQuota: number
  usedQuota: number
  alertThreshold: number
  isEnabled: boolean
  provider: { id: string; name: string }
}

/**
 * 平台配额统计
 */
export interface PlatformQuota {
  providerId: string
  providerName: string
  totalQuota: number
  usedQuota: number
  remainingQuota: number
}

/**
 * AI 使用统计
 */
export interface AiUsageStats {
  providerId: string
  module: string
  _sum: {
    tokensUsed: number
    cost: number
    inputTokens: number
    outputTokens: number
  }
  _count: number
}

/**
 * AI 充值记录
 */
export interface AiRecharge {
  id: string
  tenantId: string
  providerId: string
  amount: number
  tokens: number
  status: string
  orderNo: string
  payUrl?: string
  paidAt?: string
  createdAt: string
}

/**
 * AI 预警记录
 */
export interface AiAlert {
  id: string
  tenantId: string
  providerId: string
  remainingPercent: number
  status: string
  notifiedAt?: string
  resolvedAt?: string
  createdAt: string
}

export const aiAdminApi = {
  // ─── AI 服务商管理 ───────────────────────────────────────

  /**
   * 获取所有服务商
   */
  getProviders: () => request.get<AiProvider[]>('/ai/admin/providers'),

  /**
   * 创建服务商
   */
  createProvider: (data: any) => request.post<AiProvider>('/ai/admin/providers', data),

  /**
   * 更新服务商
   */
  updateProvider: (id: string, data: any) => request.put<AiProvider>(`/ai/admin/providers/${id}`, data),

  /**
   * 删除服务商
   */
  deleteProvider: (id: string) => request.delete(`/ai/admin/providers/${id}`),

  // ─── AI 模型管理 ───────────────────────────────────────

  /**
   * 获取所有模型
   */
  getModels: (providerId?: string) => request.get<AiModel[]>('/ai/admin/models', { params: { providerId } }),

  /**
   * 创建模型
   */
  createModel: (data: any) => request.post<AiModel>('/ai/admin/models', data),

  /**
   * 更新模型
   */
  updateModel: (id: string, data: any) => request.put<AiModel>(`/ai/admin/models/${id}`, data),

  /**
   * 删除模型
   */
  deleteModel: (id: string) => request.delete(`/ai/admin/models/${id}`),

  // ─── 机构模型配置 ───────────────────────────────────────

  /**
   * 获取机构的模型配置
   */
  getTenantModels: (tenantId: string) => request.get<TenantAiModel[]>('/ai/admin/tenant-models', { params: { tenantId } }),

  /**
   * 为机构设置模型
   */
  setTenantModel: (data: any) => request.post<TenantAiModel>('/ai/admin/tenant-models', data),

  /**
   * 移除机构模型
   */
  removeTenantModel: (params: any) => request.delete('/ai/admin/tenant-models', { params }),

  // ─── 配额管理 ───────────────────────────────────────

  /**
   * 获取平台总配额
   */
  getPlatformQuotas: () => request.get<PlatformQuota[]>('/ai/admin/quotas/platform'),

  /**
   * 获取所有机构配额
   */
  getTenantQuotas: (tenantId?: string) => request.get<TenantAiQuota[]>('/ai/admin/quotas', { params: { tenantId } }),

  /**
   * 分配配额给机构
   */
  allocateQuota: (data: any) => request.post<TenantAiQuota>('/ai/admin/quotas', data),

  // ─── 预警管理 ───────────────────────────────────────

  /**
   * 获取预警记录
   */
  getAlerts: (tenantId?: string, status?: string) => request.get<AiAlert[]>('/ai/admin/alerts', { params: { tenantId, status } }),

  /**
   * 标记预警为已处理
   */
  resolveAlert: (id: string) => request.post(`/ai/admin/alerts/${id}/resolve`),

  // ─── 使用统计 ───────────────────────────────────────

  /**
   * 获取平台使用统计
   */
  getPlatformStats: (days?: number) => request.get<any>('/ai/admin/stats/platform', { params: { days } }),

  /**
   * 获取机构使用统计
   */
  getTenantStats: (tenantId: string, days?: number) => request.get<any>('/ai/admin/stats/tenant', { params: { tenantId, days } }),

  // ─── 机构服务（只读）───────────────────────────────────────

  /**
   * 获取本机构可用服务
   */
  getTenantServices: () => request.get<any>('/ai/tenant/services'),

  /**
   * 获取本机构使用统计
   */
  getTenantUsageStats: (days?: number) => request.get<any>('/ai/tenant/stats', { params: { days } }),

  /**
   * 创建充值订单
   */
  createRecharge: (data: any) => request.post<AiRecharge>('/ai/tenant/recharge', data),

  /**
   * 获取充值记录
   */
  getRecharges: (status?: string) => request.get<AiRecharge[]>('/ai/tenant/recharges', { params: { status } }),

  /**
   * 申请增加配额
   */
  requestQuota: (data: any) => request.post('/ai/tenant/quota-request', data),

  /**
   * 获取本机构预警
   */
  getTenantAlerts: () => request.get<AiAlert[]>('/ai/tenant/alerts'),

  // ─── 模型测试与状态检测 ───────────────────────────────────────

  /**
   * 测试模型连接
   */
  testModel: (modelId: string, data: { providerId: string; message: string; mode?: 'chat' | 'mock_patient' }) =>
    request.post<ModelTestResult>(`/ai/admin/models/${modelId}/test`, data),

  /**
   * 获取模型状态
   */
  getModelStatus: (modelId: string) => request.get<ModelStatus>(`/ai/admin/models/${modelId}/status`),

  /**
   * 批量检测所有模型状态
   */
  checkAllModels: () => request.post<ModelStatus[]>('/ai/admin/models/check-all'),

  // ─── 图片生成 ───────────────────────────────────────

  /**
   * 测试图片生成
   */
  generateImage: (data: {
    providerId: string;
    prompt: string;
    model?: string;  // 模型 ID
    size?: string;  // 1024_1024, 2K, 4K, 1024_1792, 1792_1024
    style?: string;  // natural, vivid, realistic, anime, artistic
    n?: number;  // 1-4
    seed?: number;  // 随机种子
    negativePrompt?: string;  // 负向提示词
    referenceImageUrl?: string;  // 参考图 URL
  }) =>
    request.post<ImageGenerationResult>('/ai/admin/models/generate-image', data),
}
