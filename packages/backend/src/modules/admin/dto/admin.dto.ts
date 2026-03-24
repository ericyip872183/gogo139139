import { IsString, IsOptional, IsBoolean, IsDateString, IsEnum, IsArray, IsInt, Min } from 'class-validator'

// ── 机构管理 ─────────────────────────────────────────────

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

// ── 模块管理 ─────────────────────────────────────────────

export class CreateModuleDto {
  @IsString()
  code!: string

  @IsString()
  name!: string

  @IsOptional()
  @IsString()
  description?: string
}

export class GrantModuleDto {
  @IsString()
  moduleId!: string

  @IsOptional()
  @IsDateString()
  expiredAt?: string
}

// ── 机构管理员 ───────────────────────────────────────────

export class CreateTenantAdminDto {
  @IsString()
  username!: string

  @IsString()
  realName!: string

  @IsString()
  password!: string
}

// ── 机构成员管理 ─────────────────────────────────────────

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  TENANT_ADMIN = 'TENANT_ADMIN',
  SCHOOL = 'SCHOOL',
  CLASS = 'CLASS',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
}

export class CreateTenantUserDto {
  @IsString()
  username!: string

  @IsString()
  realName!: string

  @IsEnum(UserRole)
  role!: UserRole

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  email?: string

  @IsString()
  password!: string

  @IsOptional()
  @IsString()
  studentNo?: string
}

export class UpdateTenantUserDto {
  @IsOptional()
  @IsString()
  realName?: string

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  email?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsString()
  studentNo?: string
}

export class UpdateUserPasswordDto {
  @IsString()
  newPassword!: string
}

export class BatchDeleteDto {
  @IsArray()
  @IsString({ each: true })
  userIds!: string[]
}

// ── 全库用户管理 ─────────────────────────────────────────

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  realName?: string

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  email?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

// ── 操作日志 ─────────────────────────────────────────────

export class CreateOperationLogDto {
  @IsString()
  adminId!: string

  @IsString()
  action!: string

  @IsString()
  targetType!: string

  @IsString()
  targetId!: string

  @IsOptional()
  @IsString()
  targetName?: string

  @IsOptional()
  @IsString()
  details?: string
}
