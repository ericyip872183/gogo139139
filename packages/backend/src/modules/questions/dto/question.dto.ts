import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsArray,
  IsBoolean, IsNumber, ValidateNested, ArrayMinSize,
} from 'class-validator'
import { Type } from 'class-transformer'
import { QuestionType, Difficulty } from '@prisma/client'

// ─── 分类 DTO ─────────────────────────────────────────

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty({ message: '分类名称不能为空' })
  name: string

  @IsString()
  @IsOptional()
  parentId?: string

  @IsString()
  @IsOptional()
  moduleType?: string

  @IsNumber()
  @IsOptional()
  sortOrder?: number
}

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  name?: string

  @IsNumber()
  @IsOptional()
  sortOrder?: number
}

// ─── 选项 DTO ─────────────────────────────────────────

export class QuestionOptionDto {
  @IsString()
  @IsNotEmpty()
  label: string

  @IsString()
  @IsNotEmpty({ message: '选项内容不能为空' })
  content: string

  @IsBoolean()
  isCorrect: boolean

  @IsNumber()
  @IsOptional()
  sortOrder?: number
}

// ─── 题目 DTO ─────────────────────────────────────────

export class CreateQuestionDto {
  @IsEnum(QuestionType, { message: '题型不合法' })
  type: QuestionType

  @IsString()
  @IsNotEmpty({ message: '题目内容不能为空' })
  content: string

  @IsString()
  @IsOptional()
  categoryId?: string

  @IsEnum(Difficulty)
  @IsOptional()
  difficulty?: Difficulty

  @IsNumber()
  @IsOptional()
  score?: number

  @IsString()
  @IsOptional()
  explanation?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  @ArrayMinSize(0)
  options: QuestionOptionDto[]

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionMediaDto)
  @IsOptional()
  mediaItems?: QuestionMediaDto[]
}

export class UpdateQuestionDto {
  @IsString()
  @IsOptional()
  content?: string

  @IsString()
  @IsOptional()
  categoryId?: string

  @IsEnum(Difficulty)
  @IsOptional()
  difficulty?: Difficulty

  @IsNumber()
  @IsOptional()
  score?: number

  @IsString()
  @IsOptional()
  explanation?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  @IsOptional()
  options?: QuestionOptionDto[]
}

export class QueryQuestionDto {
  @IsString()
  @IsOptional()
  keyword?: string

  @IsString()
  @IsOptional()
  categoryId?: string

  @IsEnum(QuestionType)
  @IsOptional()
  type?: QuestionType

  @IsEnum(Difficulty)
  @IsOptional()
  difficulty?: Difficulty

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pageSize?: number
}

// ─── 批量导入 DTO ─────────────────────────────────────

export class ImportQuestionDto {
  @IsEnum(QuestionType)
  type: QuestionType

  @IsString()
  @IsNotEmpty()
  content: string

  @IsString()
  @IsOptional()
  categoryName?: string

  @IsString()
  @IsOptional()
  categoryId?: string

  @IsEnum(Difficulty)
  @IsOptional()
  difficulty?: Difficulty

  @IsNumber()
  @IsOptional()
  score?: number

  @IsString()
  @IsOptional()
  explanation?: string

  // 选项格式：[{ label, content, isCorrect }]
  options?: QuestionOptionDto[]

  // 判断题简写：answer: true/false
  answer?: boolean

  // 填空题答案
  fillAnswer?: string
}

// ─── 题目媒体资源 DTO ─────────────────────────────────

export class QuestionMediaDto {
  @IsString()
  @IsNotEmpty()
  type: string  // image / video / audio / file

  @IsString()
  @IsNotEmpty()
  url: string

  @IsString()
  @IsOptional()
  caption?: string

  @IsNumber()
  @IsOptional()
  sortOrder?: number

  @IsNumber()
  @IsOptional()
  fileSize?: number

  @IsNumber()
  @IsOptional()
  duration?: number
}

// 更新 CreateQuestionDto 和 UpdateQuestionDto 以支持媒体资源
export class CreateQuestionWithMediaDto extends CreateQuestionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionMediaDto)
  @IsOptional()
  mediaItems?: QuestionMediaDto[]
}

export class UpdateQuestionWithMediaDto extends UpdateQuestionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionMediaDto)
  @IsOptional()
  mediaItems?: QuestionMediaDto[]
}
