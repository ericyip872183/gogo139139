import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class PaperQuestionItemDto {
  @IsString()
  @IsNotEmpty()
  questionId: string

  @IsNumber()
  @IsOptional()
  score?: number
}

export class CreatePaperDto {
  @IsString()
  @IsNotEmpty({ message: '试卷标题不能为空' })
  title: string

  @IsString()
  @IsOptional()
  description?: string

  @IsNumber()
  @IsOptional()
  duration?: number

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaperQuestionItemDto)
  questions: PaperQuestionItemDto[]
}

export class UpdatePaperDto {
  @IsString()
  @IsOptional()
  title?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsNumber()
  @IsOptional()
  duration?: number

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaperQuestionItemDto)
  @IsOptional()
  questions?: PaperQuestionItemDto[]
}

export class QueryPaperDto {
  @IsString()
  @IsOptional()
  keyword?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pageSize?: number
}
