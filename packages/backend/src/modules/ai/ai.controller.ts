import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AiService } from './ai.service'
import { ChatDto, OcrDto, RechargeDto } from './dto/ai.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'

@Controller('ai')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AiController {
  constructor(private service: AiService) {}

  /**
   * 对话接口（模拟病人）
   */
  @Post('chat')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN', 'STUDENT')
  chat(
    @CurrentUser() user: { tenantId: string; id: string },
    @Body() dto: ChatDto,
  ) {
    return this.service.chat(user.tenantId, user.id, dto)
  }

  /**
   * OCR 识别（试题录入）
   */
  @Post('ocr')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  ocr(
    @CurrentUser() user: { tenantId: string; id: string },
    @Body() dto: OcrDto,
  ) {
    return this.service.ocr(user.tenantId, user.id, dto)
  }

  /**
   * 获取使用统计
   */
  @Get('usage')
  @Roles('TEACHER', 'TENANT_ADMIN', 'SUPER_ADMIN')
  getUsage(
    @CurrentUser() user: { tenantId: string },
    @Query('days') days?: string,
  ) {
    return this.service.getUsage(user.tenantId, days ? parseInt(days) : 30)
  }

  /**
   * 创建充值订单
   */
  @Post('recharge')
  @Roles('TENANT_ADMIN', 'SUPER_ADMIN')
  createRecharge(
    @CurrentUser() user: { tenantId: string; id: string },
    @Body() dto: RechargeDto,
  ) {
    return this.service.createRecharge(user.tenantId, user.id, dto.amount)
  }
}
