import { IsString, IsOptional, IsEnum, IsNumber, IsArray, ValidateNested, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class ScoreItemDto {
  @IsString()
  name!: string

  @IsNumber()
  score!: number

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsNumber()
  sortOrder?: number
}

export class CreateScoreTableDto {
  @IsString()
  name!: string

  @IsOptional()
  @IsEnum(['ADD', 'MINUS'])
  type?: 'ADD' | 'MINUS'

  @IsOptional()
  @IsNumber()
  totalScore?: number

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScoreItemDto)
  items?: ScoreItemDto[]
}

export class UpdateScoreTableDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsEnum(['ADD', 'MINUS'])
  type?: 'ADD' | 'MINUS'

  @IsOptional()
  @IsNumber()
  totalScore?: number

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScoreItemDto)
  items?: ScoreItemDto[]
}

export class CreateScoreRecordDto {
  @IsString()
  tableId!: string

  @IsString()
  targetId!: string

  @IsNumber()
  totalScore!: number

  itemScores!: Record<string, number>

  @IsOptional()
  @IsString()
  note?: string

  @IsOptional()
  isSynced?: boolean
}

export class QueryScoreTableDto {
  @IsOptional()
  @IsString()
  keyword?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number = 20
}
