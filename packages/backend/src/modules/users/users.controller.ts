// users.controller.ts
// 用户管理控制器：CRUD、批量导入/导出、重置密码
// 权限：TENANT_ADMIN 及以上可管理用户；TEACHER 及以上可查看用户列表
import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { UsersService } from './users.service'
import { CreateUserDto, UpdateUserDto, QueryUserDto, ImportUserDto } from './dto/user.dto'
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
}
