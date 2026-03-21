import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsBoolean, IsNumber, IsDateString } from 'class-validator'
import { Type } from 'class-transformer'
import { ExamStatus } from '@prisma/client'

export class CreateExamDto {
  @IsString()
  @IsNotEmpty({ message: '考试标题不能为空' })
  title: string

  @IsString()
  @IsNotEmpty({ message: '请选择试卷' })
  paperId: string

  @IsString()
  @IsOptional()
  description?: string

  @IsDateString()
  @IsOptional()
  startAt?: string

  @IsDateString()
  @IsOptional()
  endAt?: string

  @IsNumber()
  @IsOptional()
  duration?: number

  @IsNumber()
  @IsOptional()
  maxSwitch?: number

  // 指定考生：用户ID列表
  @IsArray()
  @IsOptional()
  participantIds?: string[]

  // 指定组织：按组织批量分配
  @IsArray()
  @IsOptional()
  organizationIds?: string[]
}

export class UpdateExamDto {
  @IsString()
  @IsOptional()
  title?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsDateString()
  @IsOptional()
  startAt?: string

  @IsDateString()
  @IsOptional()
  endAt?: string

  @IsNumber()
  @IsOptional()
  duration?: number

  @IsNumber()
  @IsOptional()
  maxSwitch?: number
}

export class QueryExamDto {
  @IsString()
  @IsOptional()
  keyword?: string

  @IsEnum(ExamStatus)
  @IsOptional()
  status?: ExamStatus

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pageSize?: number
}

export class AddParticipantsDto {
  @IsArray()
  @IsOptional()
  userIds?: string[]

  @IsArray()
  @IsOptional()
  organizationIds?: string[]
}
