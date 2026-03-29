import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Res, UseInterceptors, UploadedFile, UploadedFiles,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express'
import { Response } from 'express'
import { QuestionsService } from './questions.service'
import { AiImportService } from './services/ai-import.service'
import { PrismaService } from '../../prisma/prisma.service'
import {
  CreateCategoryDto, UpdateCategoryDto,
  CreateQuestionDto, UpdateQuestionDto, QueryQuestionDto, ImportQuestionDto,
  AiImportConfirmDto, AiImportSkipDto,
} from './dto/question.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'

@Controller('questions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class QuestionsController {
  constructor(
    private service: QuestionsService,
    private aiImport: AiImportService,
    private prisma: PrismaService,
  ) {
    // 测试日志输出
    const timestamp = new Date().toISOString()
    console.log(`\n${'='.repeat(80)}`)
    console.log(`[${timestamp}] ✅ QuestionsController 已加载`)
    console.log(`AI 导入接口路径: POST /questions/ai-import/upload`)
    console.log(`${'='.repeat(80)}\n`)
  }

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
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  createCategory(
    @CurrentUser() user: { tenantId: string },
    @Body() dto: CreateCategoryDto,
  ) {
    return this.service.createCategory(user.tenantId, dto)
  }

  @Patch('categories/:id')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  updateCategory(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.service.updateCategory(user.tenantId, id, dto)
  }

  @Delete('categories/:id')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
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
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  create(
    @CurrentUser() user: { tenantId: string },
    @Body() dto: CreateQuestionDto,
  ) {
    return this.service.create(user.tenantId, dto)
  }

  @Post('import')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  batchImport(
    @CurrentUser() user: { tenantId: string },
    @Body() body: { rows: ImportQuestionDto[] },
  ) {
    return this.service.batchImport(user.tenantId, body.rows)
  }

  @Post('import-excel')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  importExcel(
    @CurrentUser() user: { tenantId: string },
    @UploadedFile() file: any,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.service.importExcel(user.tenantId, file.buffer, categoryId)
  }

  @Get('export')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  async exportExcel(
    @CurrentUser() user: { tenantId: string },
    @Query() query: QueryQuestionDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="题目导出.xlsx"',
    })
    return this.service.exportExcel(user.tenantId, query)
  }

  @Patch(':id')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  update(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.service.update(user.tenantId, id, dto)
  }

  @Delete('batch')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  batchRemove(
    @CurrentUser() user: { tenantId: string },
    @Body() body: { ids: string[] },
  ) {
    return this.service.batchRemove(user.tenantId, body.ids)
  }

  @Delete(':id')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  remove(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
  ) {
    return this.service.remove(user.tenantId, id)
  }

  // ─── 媒体资源接口 ─────────────────────────────────────────

  /**
   * 上传题目媒体文件
   */
  @Post(':id/media')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  uploadMedia(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('caption') caption?: string,
    @Body('type') type?: string,
  ) {
    return this.service.uploadMedia(user.tenantId, id, file, caption, type)
  }

  /**
   * 获取媒体资源详情
   */
  @Get('media/:id')
  getMedia(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
  ) {
    return this.service.getMedia(user.tenantId, id)
  }

  /**
   * 删除媒体资源
   */
  @Delete('media/:id')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  removeMedia(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
  ) {
    return this.service.removeMedia(user.tenantId, id)
  }

  // ─── AI 导入题库接口 ─────────────────────────────────────────

  /**
   * 获取可用的 AI 模型列表（用于 AI 导入）
   */
  @Get('ai-import/models')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  async getAvailableModels(@CurrentUser() user: { tenantId: string }) {
    // 优先查询机构配置的"题目导入"场景模型
    const tenantModels = await this.prisma.tenantAiModel.findMany({
      where: { tenantId: user.tenantId, scene: 'question_import', isEnabled: true },
      include: { model: { include: { provider: true } } },
    })

    if (tenantModels.length > 0) {
      // 返回机构配置的模型
      return tenantModels.map(tm => tm.model)
    }

    // 机构未配置，返回所有启用的聊天模型
    return this.prisma.aiModel.findMany({
      where: { isEnabled: true, type: 'chat' },
      include: { provider: true },
    })
  }

  /**
   * 上传文件进行 AI 识别导入
   */
  @Post('ai-import/upload')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  @UseInterceptors(FilesInterceptor('files', 5))
  async aiImportUpload(
    @CurrentUser() user: { tenantId: string; id: string },
    @UploadedFiles() files: Express.Multer.File[],
    @Body('categoryId') categoryId?: string,
    @Body('model') model?: string,
  ) {
    // ━━━ 第1层日志：请求入口 ━━━
    const timestamp = new Date().toISOString()
    console.log(`[AI-IMPORT][INFO][${timestamp}][aiImportUpload] 请求入口`, JSON.stringify({
      user: {
        tenantId: user.tenantId,
        userId: user.id,
      },
      request: {
        fileCount: files?.length || 0,
        files: files?.map(f => ({
          name: f.originalname,
          size: f.size,
          mimetype: f.mimetype,
        })) || [],
        categoryId,
        model,
      },
    }, null, 2))

    return this.aiImport.createImportTask(user.tenantId, user.id, files, categoryId, model)
  }

  /**
   * 获取 AI 导入任务列表
   */
  @Get('ai-import/tasks')
  getAiImportTasks(
    @CurrentUser() user: { tenantId: string },
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.aiImport.getTaskList(user.tenantId, Number(page) || 1, Number(pageSize) || 20)
  }

  /**
   * 获取 AI 导入任务详情（含题目列表）
   */
  @Get('ai-import/tasks/:id')
  getAiImportTaskDetail(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
  ) {
    return this.aiImport.getTaskDetail(user.tenantId, id)
  }

  /**
   * 确认导入（批量入库）
   */
  @Post('ai-import/tasks/:id/confirm')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  async aiImportConfirm(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
    @Body() dto: AiImportConfirmDto,
  ) {
    return this.aiImport.confirmImport(
      id,
      user.tenantId,
      dto.itemIds,
      dto.categoryId,
      dto.difficulty,
    )
  }

  /**
   * 跳过指定题目
   */
  @Post('ai-import/tasks/:id/skip')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  aiImportSkip(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
    @Body() dto: AiImportSkipDto,
  ) {
    return this.aiImport.skipItems(id, dto.itemIds)
  }

  /**
   * 删除导入任务
   */
  @Delete('ai-import/tasks/:id')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  deleteAiImportTask(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
  ) {
    return this.aiImport.deleteTask(user.tenantId, id)
  }
}
