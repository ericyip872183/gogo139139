import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Res, UseInterceptors, UploadedFile } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { FileInterceptor } from '@nestjs/platform-express'
import { ScoreTablesService } from './score-tables.service'
import {
  CreateScoreTableDto,
  UpdateScoreTableDto,
  CreateScoreRecordDto,
  QueryScoreTableDto,
} from './dto/score-table.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Response } from 'express'

@Controller('score-tables')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ScoreTablesController {
  constructor(private service: ScoreTablesService) {}

  @Get()
  findAll(
    @CurrentUser() user: { id: string; tenantId: string },
    @Query() query: QueryScoreTableDto,
  ) {
    return this.service.findAll(user.tenantId, query)
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') id: string,
  ) {
    return this.service.findOne(user.tenantId, id)
  }

  @Post()
  create(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body() dto: CreateScoreTableDto,
  ) {
    return this.service.create(user.tenantId, dto)
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') id: string,
    @Body() dto: UpdateScoreTableDto,
  ) {
    return this.service.update(user.tenantId, id, dto)
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') id: string,
  ) {
    return this.service.remove(user.tenantId, id)
  }

  // 打分
  @Post('records')
  createRecord(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body() dto: CreateScoreRecordDto,
  ) {
    return this.service.createRecord(user.id, user.tenantId, dto)
  }

  // 查询某评分表的打分记录
  @Get(':id/records')
  getRecords(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') tableId: string,
  ) {
    return this.service.getRecords(user.tenantId, tableId)
  }

  // 批量离线同步
  @Post('records/sync')
  syncRecords(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body() body: { records: CreateScoreRecordDto[] },
  ) {
    return this.service.syncRecords(user.id, user.tenantId, body.records)
  }

  // 将评分表转换为考题
  @Post(':id/convert-to-questions')
  @Roles('TEACHER', 'TENANT_ADMIN', 'SCHOOL', 'CLASS', 'SUPER_ADMIN')
  convertToQuestions(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') tableId: string,
  ) {
    return this.service.convertToQuestions(user.tenantId, user.id, tableId)
  }

  // 导出评分记录
  @Get(':id/records/export')
  @Roles('TEACHER', 'TENANT_ADMIN', 'SCHOOL', 'CLASS', 'SUPER_ADMIN')
  async exportRecords(
    @CurrentUser() user: { tenantId: string },
    @Param('id') tableId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="评分记录.xlsx"`,
    })
    return this.service.exportRecordsExcel(user.tenantId, tableId)
  }

  // Excel 导入评分表
  @Post('import-excel')
  @Roles('TEACHER', 'TENANT_ADMIN', 'SCHOOL', 'CLASS', 'SUPER_ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  importExcel(
    @CurrentUser() user: { tenantId: string },
    @UploadedFile() file: any,
  ) {
    return this.service.importExcel(user.tenantId, file.buffer)
  }
}
