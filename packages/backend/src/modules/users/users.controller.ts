// users.controller.ts
// 用户管理控制器：CRUD、批量导入/导出、重置密码、批量激活/停用、批量设置密码
// 权限：TENANT_ADMIN 及以上可管理用户；TEACHER 及以上可查看用户列表
import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Res, UseInterceptors, UploadedFile,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { FileInterceptor } from '@nestjs/platform-express'
import { Response } from 'express'
import { UsersService } from './users.service'
import { CreateUserDto, UpdateUserDto, QueryUserDto, ImportUserDto, BatchStatusDto, BatchPasswordDto } from './dto/user.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'
import { UserRole } from '@prisma/client'

// 所有管理操作：TEACHER 及以上（均可管理低于自身层级的用户）
const MANAGE_ROLES = ['TEACHER', 'TENANT_ADMIN', 'SCHOOL', 'CLASS', 'SUPER_ADMIN'] as const
// 查看操作：TEACHER 及以上均可
const VIEW_ROLES = ['TEACHER', 'TENANT_ADMIN', 'SCHOOL', 'CLASS', 'SUPER_ADMIN'] as const

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
  constructor(private service: UsersService) {}

  @Get()
  @Roles(...VIEW_ROLES)
  findAll(
    @CurrentUser() user: { tenantId: string; role: UserRole },
    @Query() query: QueryUserDto,
  ) {
    return this.service.findAll(user.tenantId, query, user.role)
  }

  // ── 个人中心（必须在 :id 之前）────────────────────────

  @Get('me')
  getMe(@CurrentUser() user: any) {
    return this.service.findMe(user.id)
  }

  @Patch('me/password')
  changePassword(
    @CurrentUser() user: any,
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    return this.service.changePassword(user.id, body.oldPassword, body.newPassword)
  }

  // ── 导出（必须在 :id 之前）────────────────────────────

  @Get('export')
  @Roles(...MANAGE_ROLES)
  async exportExcel(
    @CurrentUser() user: { tenantId: string; role: UserRole },
    @Query() query: QueryUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="users.xlsx"',
    })
    return this.service.exportExcel(user.tenantId, query, user.role)
  }

  @Get(':id')
  @Roles(...VIEW_ROLES)
  findOne(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
  ) {
    return this.service.findOne(user.tenantId, id)
  }

  @Post()
  @Roles(...MANAGE_ROLES)
  create(
    @CurrentUser() user: { tenantId: string; role: UserRole },
    @Body() dto: CreateUserDto,
  ) {
    return this.service.create(user.tenantId, dto, user.role)
  }

  @Post('import')
  @Roles(...MANAGE_ROLES)
  batchImport(
    @CurrentUser() user: { tenantId: string; role: UserRole },
    @Body() body: { rows: ImportUserDto[] },
  ) {
    return this.service.batchImport(user.tenantId, body.rows)
  }

  @Post('import-excel')
  @Roles(...MANAGE_ROLES)
  @UseInterceptors(FileInterceptor('file'))
  importExcel(
    @CurrentUser() user: { tenantId: string },
    @UploadedFile() file: any,
  ) {
    return this.service.importExcel(user.tenantId, file.buffer)
  }

  @Patch('batch-status')
  @Roles(...MANAGE_ROLES)
  batchStatus(
    @CurrentUser() user: { tenantId: string },
    @Body() dto: BatchStatusDto,
  ) {
    return this.service.batchStatus(user.tenantId, dto.ids, dto.isActive)
  }

  @Patch('batch-password')
  @Roles(...MANAGE_ROLES)
  batchPassword(
    @CurrentUser() user: { tenantId: string },
    @Body() dto: BatchPasswordDto,
  ) {
    return this.service.batchPassword(user.tenantId, dto.ids, dto.password)
  }

  @Patch(':id')
  @Roles(...MANAGE_ROLES)
  update(
    @CurrentUser() user: { tenantId: string; role: UserRole },
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.service.update(user.tenantId, id, dto, user.role)
  }

  @Patch(':id/reset-password')
  @Roles(...MANAGE_ROLES)
  resetPassword(
    @CurrentUser() user: { tenantId: string; role: UserRole },
    @Param('id') id: string,
    @Body() body: { password: string },
  ) {
    return this.service.resetPassword(user.tenantId, id, body.password)
  }

  @Delete('batch')
  @Roles(...MANAGE_ROLES)
  batchRemove(
    @CurrentUser() user: { tenantId: string; role: UserRole },
    @Body() body: { ids: string[] },
  ) {
    return this.service.batchRemove(user.tenantId, body.ids)
  }

  @Delete(':id')
  @Roles(...MANAGE_ROLES)
  remove(
    @CurrentUser() user: { tenantId: string; role: UserRole },
    @Param('id') id: string,
  ) {
    return this.service.remove(user.tenantId, id, user.role)
  }

  @Delete(':id/force')
  @Roles(...MANAGE_ROLES)
  forceDelete(
    @CurrentUser() user: { tenantId: string; role: UserRole },
    @Param('id') id: string,
  ) {
    return this.service.forceDelete(user.tenantId, id, user.role)
  }
}
