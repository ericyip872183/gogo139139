import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import {
  CreateScoreTableDto,
  UpdateScoreTableDto,
  CreateScoreRecordDto,
  QueryScoreTableDto,
} from './dto/score-table.dto'

@Injectable()
export class ScoreTablesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, dto: QueryScoreTableDto) {
    const { keyword, page = 1, pageSize = 20 } = dto
    const where: any = { tenantId, isActive: true }
    if (keyword) where.name = { contains: keyword }

    const [total, list] = await Promise.all([
      this.prisma.scoreTable.count({ where }),
      this.prisma.scoreTable.findMany({
        where,
        include: { items: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])
    return { total, list, page, pageSize }
  }

  async findOne(tenantId: string, id: string) {
    const table = await this.prisma.scoreTable.findFirst({
      where: { id, tenantId },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!table) throw new NotFoundException('评分表不存在')
    return table
  }

  async create(tenantId: string, dto: CreateScoreTableDto) {
    const { items, ...tableData } = dto
    return this.prisma.scoreTable.create({
      data: {
        ...tableData,
        tenantId,
        items: items ? { create: items } : undefined,
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    })
  }

  async update(tenantId: string, id: string, dto: UpdateScoreTableDto) {
    const table = await this.prisma.scoreTable.findFirst({ where: { id, tenantId } })
    if (!table) throw new NotFoundException('评分表不存在')

    const { items, ...tableData } = dto
    if (items !== undefined) {
      // 替换所有评分项
      await this.prisma.scoreItem.deleteMany({ where: { tableId: id } })
    }
    return this.prisma.scoreTable.update({
      where: { id },
      data: {
        ...tableData,
        items: items !== undefined ? { create: items } : undefined,
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    })
  }

  async remove(tenantId: string, id: string) {
    const table = await this.prisma.scoreTable.findFirst({ where: { id, tenantId } })
    if (!table) throw new NotFoundException('评分表不存在')
    await this.prisma.scoreTable.update({ where: { id }, data: { isActive: false } })
    return { message: '删除成功' }
  }

  // 打分记录
  async createRecord(judgeId: string, tenantId: string, dto: CreateScoreRecordDto) {
    const table = await this.prisma.scoreTable.findFirst({
      where: { id: dto.tableId, tenantId },
    })
    if (!table) throw new NotFoundException('评分表不存在')

    return this.prisma.scoreRecord.create({
      data: {
        tableId: dto.tableId,
        judgeId,
        targetId: dto.targetId,
        totalScore: dto.totalScore,
        itemScores: dto.itemScores,
        note: dto.note,
        isSynced: dto.isSynced ?? true,
      },
      include: {
        target: { select: { id: true, realName: true, studentNo: true } },
      },
    })
  }

  async getRecordsByTable(tenantId: string, tableId: string) {
    const table = await this.prisma.scoreTable.findFirst({ where: { id: tableId, tenantId } })
    if (!table) throw new NotFoundException('评分表不存在')

    return this.prisma.scoreRecord.findMany({
      where: { tableId },
      include: {
        judge: { select: { id: true, realName: true } },
        target: { select: { id: true, realName: true, studentNo: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  // 批量离线同步
  async syncRecords(judgeId: string, tenantId: string, records: CreateScoreRecordDto[]) {
    const created = await Promise.all(
      records.map(r => this.createRecord(judgeId, tenantId, { ...r, isSynced: true }))
    )
    return { synced: created.length }
  }
}
