import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { QuestionsService } from './questions.service'
import {
  CreateCategoryDto, UpdateCategoryDto,
  CreateQuestionDto, UpdateQuestionDto, QueryQuestionDto, ImportQuestionDto,
} from './dto/question.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'

@Controller('questions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class QuestionsController {
  constructor(private service: QuestionsService) {}

  // ─── 分类接口 ─────────────────────────────────────────

  @Get('categories/tree')
  getCategoryTree(@CurrentUser() user: { tenantId: string }) {
    return this.service.getCategoryTree(user.tenantId)
  }

  @Get('categories/list')
  getCategoryList(@CurrentUser() user: { tenantId: string }) {
    return this.service.getCategoryList(user.tenantId)
  }

  @Post('categories')
  @Roles('TEACHER', 'TENANT_ADMIN', 'SCHOOL', 'CLASS', 'SUPER_ADMIN')
  createCategory(
    @CurrentUser() user: { tenantId: string },
    @Body() dto: CreateCategoryDto,
  ) {
    return this.service.createCategory(user.tenantId, dto)
  }

  @Patch('categories/:id')
  @Roles('TEACHER', 'TENANT_ADMIN', 'SCHOOL', 'CLASS', 'SUPER_ADMIN')
  updateCategory(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.service.updateCategory(user.tenantId, id, dto)
  }

  @Delete('categories/:id')
  @Roles('TEACHER', 'TENANT_ADMIN', 'SCHOOL', 'CLASS', 'SUPER_ADMIN')
  removeCategory(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
  ) {
    return this.service.removeCategory(user.tenantId, id)
  }

  // ─── 题目接口 ─────────────────────────────────────────

  @Get()
  findAll(
    @CurrentUser() user: { tenantId: string },
    @Query() query: QueryQuestionDto,
  ) {
    return this.service.findAll(user.tenantId, query)
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
  ) {
    return this.service.findOne(user.tenantId, id)
  }

  @Post()
  @Roles('TEACHER', 'TENANT_ADMIN', 'SCHOOL', 'CLASS', 'SUPER_ADMIN')
  create(
    @CurrentUser() user: { tenantId: string },
    @Body() dto: CreateQuestionDto,
  ) {
    return this.service.create(user.tenantId, dto)
  }

  @Post('import')
  @Roles('TEACHER', 'TENANT_ADMIN', 'SCHOOL', 'CLASS', 'SUPER_ADMIN')
  batchImport(
    @CurrentUser() user: { tenantId: string },
    @Body() body: { rows: ImportQuestionDto[] },
  ) {
    return this.service.batchImport(user.tenantId, body.rows)
  }

  @Patch(':id')
  @Roles('TEACHER', 'TENANT_ADMIN', 'SCHOOL', 'CLASS', 'SUPER_ADMIN')
  update(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.service.update(user.tenantId, id, dto)
  }

  @Delete('batch')
  @Roles('TEACHER', 'TENANT_ADMIN', 'SCHOOL', 'CLASS', 'SUPER_ADMIN')
  batchRemove(
    @CurrentUser() user: { tenantId: string },
    @Body() body: { ids: string[] },
  ) {
    return this.service.batchRemove(user.tenantId, body.ids)
  }

  @Delete(':id')
  @Roles('TEACHER', 'TENANT_ADMIN', 'SCHOOL', 'CLASS', 'SUPER_ADMIN')
  remove(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
  ) {
    return this.service.remove(user.tenantId, id)
  }
}
