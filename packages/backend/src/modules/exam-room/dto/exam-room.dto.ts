import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator'

export class SaveAnswerDto {
  @IsString()
  @IsNotEmpty()
  questionId: string

  @IsString()
  @IsNotEmpty()
  answer: string  // JSON 字符串
}

export class SubmitExamDto {
  @IsBoolean()
  @IsOptional()
  forced?: boolean  // 是否强制提交（超时/切屏超限）
}
