import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { OrganizationsService } from './organizations.service'
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'

@Controller('organizations')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class OrganizationsController {
  constructor(private service: OrganizationsService) {}

  @Get('tree')
  getTree(@CurrentUser() user: { tenantId: string }) {
    return this.service.getTree(user.tenantId)
  }

  @Get('list')
  getList(@CurrentUser() user: { tenantId: string }) {
    return this.service.getList(user.tenantId)
  }

  @Post()
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  create(
    @CurrentUser() user: { tenantId: string },
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.service.create(user.tenantId, dto)
  }

  @Patch(':id')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  update(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.service.update(user.tenantId, id, dto)
  }

  @Delete(':id')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  remove(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
  ) {
    return this.service.remove(user.tenantId, id)
  }
}
