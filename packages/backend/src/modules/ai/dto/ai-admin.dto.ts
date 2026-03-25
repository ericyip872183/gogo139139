import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsObject, IsEnum, Transform } from 'class-validator'

/**
 * AI 服务商 DTO
 */
export class CreateProviderDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  baseUrl: string

  @IsString()
  @IsOptional()
  authType?: string

  @IsString()
  @IsNotEmpty()
  apiKey: string

  @IsString()
  @IsOptional()
  apiSecret?: string

  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return true
    return value
  })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean

  @IsObject()
  @IsOptional()
  config?: any
}

export class UpdateProviderDto {
  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  baseUrl?: string

  @IsString()
  @IsOptional()
  apiKey?: string

  @IsString()
  @IsOptional()
  apiSecret?: string

  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined
    return value
  })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean

  @IsObject()
  @IsOptional()
  config?: any
}

/**
 * AI 模型 DTO
 */
export class CreateModelDto {
  @IsString()
  @IsNotEmpty()
  providerId: string

  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  modelId: string

  @IsBoolean()
  @IsOptional()
  isEp?: boolean = false

  @IsNumber()
  @IsOptional()
  inputPrice?: number = 0

  @IsNumber()
  @IsOptional()
  outputPrice?: number = 0

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean = true
}

export class UpdateModelDto {
  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  modelId?: string

  @IsBoolean()
  @IsOptional()
  isEp?: boolean

  @IsNumber()
  @IsOptional()
  inputPrice?: number

  @IsNumber()
  @IsOptional()
  outputPrice?: number

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean
}

/**
 * 机构模型配置 DTO
 */
export class SetTenantModelDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string

  @IsString()
  @IsNotEmpty()
  providerId: string

  @IsString()
  @IsNotEmpty()
  modelId: string

  @IsString()
  @IsNotEmpty()
  scene: string

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean = false

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean = true
}

/**
 * 配额管理 DTO
 */
export class AllocateQuotaDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string

  @IsString()
  @IsNotEmpty()
  providerId: string

  @IsNumber()
  @IsNotEmpty()
  totalQuota: number

  @IsNumber()
  @IsOptional()
  alertThreshold?: number = 20
}

export class RequestQuotaDto {
  @IsString()
  @IsNotEmpty()
  providerId: string

  @IsNumber()
  @IsNotEmpty()
  amount: number

  @IsString()
  @IsOptional()
  reason?: string
}

/**
 * 充值 DTO
 */
export class CreateRechargeDto {
  @IsString()
  @IsNotEmpty()
  providerId: string

  @IsNumber()
  @IsNotEmpty()
  amount: number
}

/**
 * 使用统计 DTO
 */
export enum StatsTimeRange {
  LAST_7_DAYS = '7',
  LAST_30_DAYS = '30',
  LAST_90_DAYS = '90',
}

export class GetStatsDto {
  @IsEnum(StatsTimeRange)
  @IsOptional()
  range?: StatsTimeRange = StatsTimeRange.LAST_30_DAYS
}
