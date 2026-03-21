import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ScoreTablesService } from './score-tables.service'
import {
  CreateScoreTableDto,
  UpdateScoreTableDto,
  CreateScoreRecordDto,
  QueryScoreTableDto,
} from './dto/score-table.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@Controller('score-tables')
@UseGuards(AuthGuard('jwt'))
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
    return this.service.getRecordsByTable(user.tenantId, tableId)
  }

  // 批量离线同步
  @Post('records/sync')
  syncRecords(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body() body: { records: CreateScoreRecordDto[] },
  ) {
    return this.service.syncRecords(user.id, user.tenantId, body.records)
  }
}
