/**
 * AI 导入题库 DTO
 * 用于 AI 智能识别导入题目功能
 */
import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsArray,
  IsNumber, ValidateNested, ArrayMinSize, IsBoolean,
} from 'class-validator'
import { Type } from 'class-transformer'
import { QuestionType, Difficulty } from '@prisma/client'

// ─── 文件上传 DTO ─────────────────────────────────────────

export class AiImportUploadDto {
  @IsString()
  @IsOptional()
  categoryId?: string

  @IsString()
  @IsOptional()
  model?: string  // 使用的 AI 模型
}

// ─── AI 解析结果 DTO ─────────────────────────────────────

export class AiImportItemDto {
  @IsEnum(QuestionType)
  questionType: QuestionType

  @IsString()
  @IsNotEmpty()
  content: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiImportOptionDto)
  @IsOptional()
  options?: AiImportOptionDto[]

  @IsString()
  @IsNotEmpty()
  answer: string

  @IsString()
  @IsOptional()
  explanation?: string

  @IsEnum(Difficulty)
  @IsOptional()
  difficulty?: Difficulty
}

export class AiImportOptionDto {
  @IsString()
  @IsNotEmpty()
  label: string

  @IsString()
  @IsNotEmpty()
  content: string

  @IsBoolean()
  isCorrect: boolean

  @IsNumber()
  @IsOptional()
  sortOrder?: number
}

// ─── 校对确认 DTO ─────────────────────────────────────

export class AiImportConfirmDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  itemIds: string[]

  @IsString()
  @IsNotEmpty()
  categoryId: string

  @IsEnum(Difficulty)
  @IsOptional()
  difficulty?: Difficulty
}

// ─── 跳过题目 DTO ─────────────────────────────────────

export class AiImportSkipDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  itemIds: string[]
}

// ─── 重复检测响应 DTO ──────────────────────────────────

export class DuplicateCheckResult {
  isDuplicate: boolean
  similarity: number  // 相似度 0-1
  existingQuestion?: {
    id: string
    content: string
    categoryId?: string
  }
}

// ─── 导入任务响应 DTO ──────────────────────────────────

export class AiImportTaskResponse {
  id: string
  fileName: string
  fileType: string
  status: string
  totalCount: number
  successCount: number
  errorCount: number
  createdAt: string
  completedAt?: string
}

export class AiImportItemResponse {
  id: string
  questionType: string
  content: string
  options?: any[]
  answer: string
  explanation?: string
  difficulty: string
  status: string
  importedId?: string
  errorMessage?: string
  isDuplicate?: boolean
  similarity?: number
}

// ─── 答案格式校验规则 ───────────────────────────────────

export const ANSWER_VALIDATION_RULES = {
  SINGLE: {
    pattern: /^[A-D]$/,
    message: '单选题答案必须是 A/B/C/D 中的一个',
  },
  MULTIPLE: {
    pattern: /^[A-E]{2,5}$/,
    message: '多选题答案必须是 2-5 个大写字母组合（如 ABCD）',
  },
  JUDGE: {
    pattern: /^[AB]$/,
    message: '判断题答案必须是 A 或 B（正确/错误）',
  },
  FILL: {
    validator: (answer: string) => answer.trim().length > 0,
    message: '填空题答案不能为空',
  },
}
