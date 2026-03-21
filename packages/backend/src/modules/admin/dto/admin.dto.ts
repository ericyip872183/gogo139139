import { IsString, IsOptional, IsBoolean, IsDateString } from 'class-validator'

export class CreateTenantDto {
  @IsString()
  name!: string

  @IsString()
  code!: string

  @IsOptional()
  @IsString()
  logo?: string

  @IsOptional()
  @IsDateString()
  expiredAt?: string
}

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  logo?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsDateString()
  expiredAt?: string
}

export class CreateModuleDto {
  @IsString()
  code!: string

  @IsString()
  name!: string

  @IsOptional()
  @IsString()
  description?: string
}

export class CreateTenantAdminDto {
  @IsString()
  username!: string

  @IsString()
  realName!: string

  @IsString()
  password!: string
}

export class GrantModuleDto {
  @IsString()
  moduleId!: string

  @IsOptional()
  @IsDateString()
  expiredAt?: string
}
