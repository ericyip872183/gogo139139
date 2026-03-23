import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AdminService } from './admin.service'
import { CreateTenantDto, UpdateTenantDto, CreateModuleDto, GrantModuleDto, CreateTenantAdminDto } from './dto/admin.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ForbiddenException } from '@nestjs/common'

@Controller('admin')
@UseGuards(AuthGuard('jwt'))
export class AdminController {
  constructor(private service: AdminService) {}

  private guard(user: { role: string }) {
    if (user.role !== 'SUPER_ADMIN') throw new ForbiddenException('仅超级管理员可访问')
  }

  // ── 机构 ──
  @Get('tenants')
  listTenants(@CurrentUser() u: any, @Query('keyword') keyword?: string) {
    this.guard(u)
    return this.service.listTenants(keyword)
  }

  @Post('tenants')
  createTenant(@CurrentUser() u: any, @Body() dto: CreateTenantDto) {
    this.guard(u)
    return this.service.createTenant(dto)
  }

  @Patch('tenants/:id')
  updateTenant(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: UpdateTenantDto) {
    this.guard(u)
    return this.service.updateTenant(id, dto)
  }

  @Post('tenants/:tenantId/admin')
  createTenantAdmin(
    @CurrentUser() u: any,
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateTenantAdminDto,
  ) {
    this.guard(u)
    return this.service.createTenantAdmin(tenantId, dto)
  }

  // ── 模块 ──
  @Get('modules')
  listModules(@CurrentUser() u: any) {
    this.guard(u)
    return this.service.listModules()
  }

  @Post('modules')
  createModule(@CurrentUser() u: any, @Body() dto: CreateModuleDto) {
    this.guard(u)
    return this.service.createModule(dto)
  }

  // ── 模块授权 ──
  @Get('tenants/:tenantId/modules')
  listTenantModules(@CurrentUser() u: any, @Param('tenantId') tenantId: string) {
    this.guard(u)
    return this.service.listTenantModules(tenantId)
  }

  @Post('tenants/:tenantId/modules')
  grantModule(
    @CurrentUser() u: any,
    @Param('tenantId') tenantId: string,
    @Body() dto: GrantModuleDto,
  ) {
    this.guard(u)
    return this.service.grantModule(tenantId, dto)
  }

  @Delete('tenants/:tenantId/modules/:moduleId')
  revokeModule(
    @CurrentUser() u: any,
    @Param('tenantId') tenantId: string,
    @Param('moduleId') moduleId: string,
  ) {
    this.guard(u)
    return this.service.revokeModule(tenantId, moduleId)
  }

  // ── 统计 ──
  @Get('stats')
  getStats(@CurrentUser() u: any) {
    this.guard(u)
    return this.service.getStats()
  }

  // ── 超管首页统计 ──
  @Get('dashboard/stats')
  getDashboardStats(@CurrentUser() u: any) {
    this.guard(u)
    return this.service.getDashboardStats()
  }
}
