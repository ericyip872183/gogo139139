import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ExamsService } from './exams.service'
import { CreateExamDto, UpdateExamDto, QueryExamDto, AddParticipantsDto } from './dto/exam.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'

@Controller('exams')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ExamsController {
  constructor(private service: ExamsService) {}

  @Get()
  findAll(@CurrentUser() user: { tenantId: string }, @Query() query: QueryExamDto) {
    return this.service.findAll(user.tenantId, query)
  }

  @Get('my')
  findForStudent(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.service.findForStudent(user.id, user.tenantId)
  }

  @Get(':id')
  findOne(@CurrentUser() user: { tenantId: string }, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id)
  }

  @Get(':id/participants')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  getParticipants(@CurrentUser() user: { tenantId: string }, @Param('id') id: string) {
    return this.service.getParticipants(user.tenantId, id)
  }

  @Post()
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  create(@CurrentUser() user: { tenantId: string }, @Body() dto: CreateExamDto) {
    return this.service.create(user.tenantId, dto)
  }

  @Post(':id/publish')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  publish(@CurrentUser() user: { tenantId: string }, @Param('id') id: string) {
    return this.service.publish(user.tenantId, id)
  }

  @Post(':id/cancel')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  cancel(@CurrentUser() user: { tenantId: string }, @Param('id') id: string) {
    return this.service.cancel(user.tenantId, id)
  }

  @Post(':id/clone')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  clone(@CurrentUser() user: { tenantId: string }, @Param('id') id: string) {
    return this.service.clone(user.tenantId, id)
  }

  @Post(':id/participants')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  addParticipants(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
    @Body() dto: AddParticipantsDto,
  ) {
    return this.service.addParticipants(user.tenantId, id, dto)
  }

  @Patch(':id')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  update(@CurrentUser() user: { tenantId: string }, @Param('id') id: string, @Body() dto: UpdateExamDto) {
    return this.service.update(user.tenantId, id, dto)
  }

  @Delete(':id/participants/:userId')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  removeParticipant(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.service.removeParticipant(user.tenantId, id, userId)
  }

  @Delete(':id')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  remove(@CurrentUser() user: { tenantId: string }, @Param('id') id: string) {
    return this.service.remove(user.tenantId, id)
  }
}
