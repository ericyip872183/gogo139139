import { IsString, IsNotEmpty, MinLength } from 'class-validator'

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string

  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  password: string

  @IsString()
  @IsNotEmpty({ message: '机构编码不能为空' })
  tenantCode: string
}

export class SendCodeDto {
  @IsString()
  @IsNotEmpty({ message: '机构编码不能为空' })
  tenantCode: string

  @IsString()
  @IsNotEmpty({ message: '手机号或邮箱不能为空' })
  contact: string   // 手机号或邮箱

  @IsString()
  @IsNotEmpty()
  purpose: 'login' | 'reset'
}

export class LoginByCodeDto {
  @IsString()
  @IsNotEmpty({ message: '机构编码不能为空' })
  tenantCode: string

  @IsString()
  @IsNotEmpty({ message: '手机号或邮箱不能为空' })
  contact: string

  @IsString()
  @IsNotEmpty({ message: '验证码不能为空' })
  code: string
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: '机构编码不能为空' })
  tenantCode: string

  @IsString()
  @IsNotEmpty({ message: '手机号或邮箱不能为空' })
  contact: string

  @IsString()
  @IsNotEmpty({ message: '验证码不能为空' })
  code: string

  @IsString()
  @MinLength(6, { message: '新密码至少6位' })
  newPassword: string
}
