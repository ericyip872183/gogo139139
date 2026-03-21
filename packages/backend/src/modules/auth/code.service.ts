import { Injectable, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'
import * as nodemailer from 'nodemailer'

@Injectable()
export class CodeService {
  private redis: Redis
  private mailer: nodemailer.Transporter | null = null

  constructor(private config: ConfigService) {
    this.redis = new Redis({
      host: config.get('REDIS_HOST', 'localhost'),
      port: config.get<number>('REDIS_PORT', 6379),
      password: config.get('REDIS_PASSWORD') || undefined,
    })

    const smtpHost = config.get('SMTP_HOST')
    if (smtpHost) {
      this.mailer = nodemailer.createTransport({
        host: smtpHost,
        port: config.get<number>('SMTP_PORT', 465),
        secure: config.get<number>('SMTP_PORT', 465) === 465,
        auth: {
          user: config.get('SMTP_USER'),
          pass: config.get('SMTP_PASS'),
        },
      })
    }
  }

  /** 判断是否邮箱格式 */
  isEmail(contact: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)
  }

  /** 判断是否手机号格式 */
  isPhone(contact: string) {
    return /^1[3-9]\d{9}$/.test(contact)
  }

  /** 生成并存储验证码，返回 6 位数字码 */
  async generate(key: string, ttlSeconds = 300): Promise<string> {
    const code = String(Math.floor(100000 + Math.random() * 900000))
    await this.redis.set(`otp:${key}`, code, 'EX', ttlSeconds)
    return code
  }

  /** 校验验证码（校验通过后删除） */
  async verify(key: string, code: string): Promise<void> {
    const stored = await this.redis.get(`otp:${key}`)
    if (!stored || stored !== code.trim()) {
      throw new BadRequestException('验证码错误或已过期')
    }
    await this.redis.del(`otp:${key}`)
  }

  /** 检查发送频率限制（60秒内不重复发） */
  async checkRateLimit(key: string): Promise<void> {
    const ratKey = `otp_rate:${key}`
    const exists = await this.redis.exists(ratKey)
    if (exists) throw new BadRequestException('发送太频繁，请 60 秒后再试')
    await this.redis.set(ratKey, '1', 'EX', 60)
  }

  /** 发送邮件验证码 */
  async sendEmail(to: string, code: string, purpose: '登录' | '重置密码') {
    if (!this.mailer) {
      // 未配置 SMTP：开发模式打印到控制台
      console.log(`[DEV] 邮件验证码 → ${to}  CODE: ${code}  用途: ${purpose}`)
      return
    }
    const from = this.config.get('SMTP_FROM', this.config.get('SMTP_USER'))
    await this.mailer.sendMail({
      from: `"盼蕾教学平台" <${from}>`,
      to,
      subject: `【盼蕾平台】${purpose}验证码`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#409eff">盼蕾教学平台</h2>
          <p>您正在进行 <strong>${purpose}</strong>，验证码为：</p>
          <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#303133;margin:16px 0">${code}</div>
          <p style="color:#909399;font-size:13px">验证码 5 分钟内有效，请勿泄露给他人。</p>
        </div>
      `,
    })
  }

  /** 发送短信验证码（需接入短信服务商） */
  async sendSms(phone: string, code: string, purpose: '登录' | '重置密码') {
    // TODO: 接入阿里云/腾讯云短信 SDK
    // 当前为开发模式，打印到控制台
    console.log(`[DEV] 短信验证码 → ${phone}  CODE: ${code}  用途: ${purpose}`)
  }
}
