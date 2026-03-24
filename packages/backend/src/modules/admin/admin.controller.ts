import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AdminService } from './admin.service'
import {
  CreateTenantDto, UpdateTenantDto, CreateModuleDto, GrantModuleDto,
  CreateTenantAdminDto, CreateTenantUserDto, UpdateTenantUserDto,
  UpdateUserPasswordDto, BatchDeleteDto, UpdateUserDto
} from './dto/admin.dto'
import { UserRole } from './dto/admin.dto'
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

  // ── 机构成员管理 ──────────────────────────────────────

  @Get('tenants/:tenantId/users')
  listTenantUsers(
    @CurrentUser() u: any,
    @Param('tenantId') tenantId: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('keyword') keyword?: string,
  ) {
    this.guard(u)
    return this.service.listTenantUsers(tenantId, page, pageSize, keyword)
  }

  @Post('tenants/:tenantId/users')
  createTenantUser(
    @CurrentUser() u: any,
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateTenantUserDto,
  ) {
    this.guard(u)
    return this.service.createTenantUser(tenantId, dto, u.id)
  }

  @Patch('tenants/:tenantId/users/:userId')
  updateTenantUser(
    @CurrentUser() u: any,
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateTenantUserDto,
  ) {
    this.guard(u)
    return this.service.updateTenantUser(tenantId, userId, dto, u.id)
  }

  @Delete('tenants/:tenantId/users/:userId')
  deleteTenantUser(
    @CurrentUser() u: any,
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
  ) {
    this.guard(u)
    return this.service.deleteTenantUser(tenantId, userId, u.id)
  }

  @Post('tenants/:tenantId/users/batch-delete')
  batchDeleteTenantUsers(
    @CurrentUser() u: any,
    @Param('tenantId') tenantId: string,
    @Body() dto: BatchDeleteDto,
  ) {
    this.guard(u)
    return this.service.batchDeleteTenantUsers(tenantId, dto.userIds, u.id)
  }

  @Patch('tenants/:tenantId/users/:userId/role')
  updateTenantUserRole(
    @CurrentUser() u: any,
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Body('role') role: UserRole,
  ) {
    this.guard(u)
    return this.service.updateTenantUserRole(tenantId, userId, role, u.id)
  }

  @Patch('tenants/:tenantId/users/:userId/reset-password')
  resetTenantUserPassword(
    @CurrentUser() u: any,
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Body('newPassword') newPassword: string,
  ) {
    this.guard(u)
    return this.service.resetTenantUserPassword(tenantId, userId, newPassword, u.id)
  }

  // ── 全库用户管理 ──────────────────────────────────────

  @Get('users')
  listAllUsers(
    @CurrentUser() u: any,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('keyword') keyword?: string,
    @Query('tenantId') tenantId?: string,
    @Query('role') role?: string,
  ) {
    this.guard(u)
    return this.service.listAllUsers(page, pageSize, keyword, tenantId, role)
  }

  @Get('users/:id')
  getUserDetail(
    @CurrentUser() u: any,
    @Param('id') id: string,
  ) {
    this.guard(u)
    return this.service.getUserDetail(id)
  }

  @Patch('users/:userId')
  updateUser(
    @CurrentUser() u: any,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    this.guard(u)
    return this.service.updateUser(userId, dto, u.id)
  }

  @Delete('users/:userId')
  deleteUser(
    @CurrentUser() u: any,
    @Param('userId') userId: string,
  ) {
    this.guard(u)
    return this.service.deleteUser(userId, u.id)
  }

  @Get('users/search/by-contact')
  searchUserByContact(
    @CurrentUser() u: any,
    @Query('contact') contact: string,
  ) {
    this.guard(u)
    return this.service.searchUserByContact(contact)
  }

  // ── 组织架构 ──────────────────────────────────────

  @Get('tenants/:tenantId/organizations')
  getTenantOrganizations(
    @CurrentUser() u: any,
    @Param('tenantId') tenantId: string,
  ) {
    this.guard(u)
    return this.service.getTenantOrganizations(tenantId)
  }

  // ── 操作日志 ──────────────────────────────────────

  @Get('operation-logs')
  getOperationLogs(
    @CurrentUser() u: any,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('adminId') adminId?: string,
    @Query('action') action?: string,
  ) {
    this.guard(u)
    return this.service.getOperationLogs(page, pageSize, adminId, action)
  }
}
