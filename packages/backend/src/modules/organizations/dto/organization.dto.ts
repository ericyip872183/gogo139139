import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max } from 'class-validator'

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty({ message: '组织名称不能为空' })
  name: string

  @IsString()
  @IsOptional()
  parentId?: string

  @IsInt()
  @IsOptional()
  sortOrder?: number
}

export class UpdateOrganizationDto {
  @IsString()
  @IsOptional()
  name?: string

  @IsInt()
  @IsOptional()
  sortOrder?: number
}
