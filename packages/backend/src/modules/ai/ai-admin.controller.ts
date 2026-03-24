import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AiAdminService } from './ai-admin.service'
import {
  CreateProviderDto,
  UpdateProviderDto,
  CreateModelDto,
  UpdateModelDto,
  SetTenantModelDto,
  AllocateQuotaDto,
  RequestQuotaDto,
  GetStatsDto,
} from './dto/ai-admin.dto'

/**
 * AI 平台管理控制器（超管专属）
 */
@Controller('ai/admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AiAdminController {
  constructor(private service: AiAdminService) {}

  // ─── AI 服务商管理 ───────────────────────────────────────

  /**
   * 获取所有服务商
   */
  @Get('providers')
  @Roles('SUPER_ADMIN')
  getProviders() {
    return this.service.getProviders()
  }

  /**
   * 创建服务商
   */
  @Post('providers')
  @Roles('SUPER_ADMIN')
  createProvider(@Body() dto: CreateProviderDto) {
    return this.service.createProvider(dto)
  }

  /**
   * 更新服务商
   */
  @Put('providers/:id')
  @Roles('SUPER_ADMIN')
  updateProvider(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateProvider(id, dto)
  }

  /**
   * 删除服务商
   */
  @Delete('providers/:id')
  @Roles('SUPER_ADMIN')
  deleteProvider(@Param('id') id: string) {
    return this.service.deleteProvider(id)
  }

  // ─── AI 模型管理 ───────────────────────────────────────

  /**
   * 获取所有模型
   */
  @Get('models')
  @Roles('SUPER_ADMIN')
  getModels(@Query('providerId') providerId?: string) {
    return this.service.getModels(providerId)
  }

  /**
   * 创建模型
   */
  @Post('models')
  @Roles('SUPER_ADMIN')
  createModel(@Body() dto: CreateModelDto) {
    return this.service.createModel(dto)
  }

  /**
   * 更新模型
   */
  @Put('models/:id')
  @Roles('SUPER_ADMIN')
  updateModel(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateModel(id, dto)
  }

  /**
   * 删除模型
   */
  @Delete('models/:id')
  @Roles('SUPER_ADMIN')
  deleteModel(@Param('id') id: string) {
    return this.service.deleteModel(id)
  }

  // ─── 机构模型配置 ───────────────────────────────────────

  /**
   * 获取机构的模型配置
   */
  @Get('tenant-models')
  @Roles('SUPER_ADMIN')
  getTenantModels(@Query('tenantId') tenantId: string) {
    return this.service.getTenantModels(tenantId)
  }

  /**
   * 为机构设置模型
   */
  @Post('tenant-models')
  @Roles('SUPER_ADMIN')
  setTenantModel(@Body() dto: SetTenantModelDto) {
    return this.service.setTenantModel(dto)
  }

  /**
   * 移除机构模型
   */
  @Delete('tenant-models')
  @Roles('SUPER_ADMIN')
  removeTenantModel(@Query() query: { tenantId: string; providerId: string; modelId: string; scene: string }) {
    return this.service.removeTenantModel(query.tenantId, query.providerId, query.modelId, query.scene)
  }

  // ─── 配额管理 ───────────────────────────────────────

  /**
   * 获取平台总配额
   */
  @Get('quotas/platform')
  @Roles('SUPER_ADMIN')
  getPlatformQuotas() {
    return this.service.getPlatformQuotas()
  }

  /**
   * 获取所有机构配额
   */
  @Get('quotas')
  @Roles('SUPER_ADMIN')
  getTenantQuotas(@Query('tenantId') tenantId?: string) {
    return this.service.getTenantQuotas(tenantId)
  }

  /**
   * 分配配额给机构
   */
  @Post('quotas')
  @Roles('SUPER_ADMIN')
  allocateQuota(@Body() dto: AllocateQuotaDto) {
    return this.service.allocateQuota(dto)
  }

  // ─── 预警管理 ───────────────────────────────────────

  /**
   * 获取预警记录
   */
  @Get('alerts')
  @Roles('SUPER_ADMIN')
  getAlerts(
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.getAlerts(tenantId, status)
  }

  /**
   * 标记预警为已处理
   */
  @Post('alerts/:id/resolve')
  @Roles('SUPER_ADMIN')
  resolveAlert(@Param('id') id: string) {
    return this.service.resolveAlert(id)
  }

  // ─── 使用统计 ───────────────────────────────────────

  /**
   * 获取平台使用统计
   */
  @Get('stats/platform')
  @Roles('SUPER_ADMIN')
  getPlatformStats(@Query('days') days?: string) {
    return this.service.getPlatformStats(days ? parseInt(days) : 30)
  }

  /**
   * 获取机构使用统计
   */
  @Get('stats/tenant')
  @Roles('SUPER_ADMIN')
  getTenantStats(
    @Query('tenantId') tenantId: string,
    @Query('days') days?: string,
  ) {
    return this.service.getTenantStats(tenantId, days ? parseInt(days) : 30)
  }
}
