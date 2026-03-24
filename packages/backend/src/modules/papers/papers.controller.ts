import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { PapersService } from './papers.service'
import { CreatePaperDto, UpdatePaperDto, QueryPaperDto } from './dto/paper.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'

@Controller('papers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PapersController {
  constructor(private service: PapersService) {}

  @Get()
  findAll(@CurrentUser() user: { tenantId: string }, @Query() query: QueryPaperDto) {
    return this.service.findAll(user.tenantId, query)
  }

  @Get(':id')
  findOne(@CurrentUser() user: { tenantId: string }, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id)
  }

  @Post()
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  create(@CurrentUser() user: { tenantId: string }, @Body() dto: CreatePaperDto) {
    return this.service.create(user.tenantId, dto)
  }

  @Patch(':id')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  update(@CurrentUser() user: { tenantId: string }, @Param('id') id: string, @Body() dto: UpdatePaperDto) {
    return this.service.update(user.tenantId, id, dto)
  }

  @Delete(':id')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  remove(@CurrentUser() user: { tenantId: string }, @Param('id') id: string) {
    return this.service.remove(user.tenantId, id)
  }
}
