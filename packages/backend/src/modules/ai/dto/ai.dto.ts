import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum } from 'class-validator'

export enum AiModuleType {
  MOCK_PATIENT = 'mock_patient',  // 模拟病人
  OCR = 'ocr',                     // OCR 识别
}

export class ChatDto {
  @IsString()
  @IsNotEmpty()
  message: string

  @IsString()
  @IsOptional()
  context?: string  // 上下文（病史/症状等）

  @IsString()
  @IsOptional()
  role?: string  // 用户角色（doctor/patient）
}

export class OcrDto {
  @IsString()
  @IsNotEmpty()
  imageUrl: string  // 图片 URL 或 base64
}

export class RechargeDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number  // 充值金额
}
