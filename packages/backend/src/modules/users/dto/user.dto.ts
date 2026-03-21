import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsEmail, IsMobilePhone, MinLength,
} from 'class-validator'
import { Type } from 'class-transformer'
import { UserRole } from '@prisma/client'

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string

  @IsString()
  @MinLength(6, { message: '密码至少6位' })
  password: string

  @IsString()
  @IsNotEmpty({ message: '姓名不能为空' })
  realName: string

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole

  @IsString()
  @IsOptional()
  studentNo?: string

  @IsString()
  @IsOptional()
  phone?: string

  @IsEmail({}, { message: '邮箱格式不正确' })
  @IsOptional()
  email?: string

  @IsString()
  @IsOptional()
  organizationId?: string
}

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  realName?: string

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole

  @IsString()
  @IsOptional()
  studentNo?: string

  @IsString()
  @IsOptional()
  phone?: string

  @IsEmail({}, { message: '邮箱格式不正确' })
  @IsOptional()
  email?: string

  @IsString()
  @IsOptional()
  organizationId?: string

  @IsOptional()
  isActive?: boolean
}

export class QueryUserDto {
  @IsString()
  @IsOptional()
  keyword?: string

  @IsString()
  @IsOptional()
  organizationId?: string

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole

  @IsOptional()
  @Type(() => Number)
  page?: number

  @IsOptional()
  @Type(() => Number)
  pageSize?: number
}

export class ImportUserDto {
  @IsString()
  @IsNotEmpty()
  username: string

  @IsString()
  @IsNotEmpty()
  realName: string

  @IsString()
  @IsOptional()
  password?: string

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole

  @IsString()
  @IsOptional()
  studentNo?: string

  @IsString()
  @IsOptional()
  phone?: string

  @IsString()
  @IsOptional()
  organizationName?: string
}
