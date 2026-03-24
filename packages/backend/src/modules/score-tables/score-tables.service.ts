import { Injectable, NotFoundException, ForbiddenException, StreamableFile, BadRequestException } from '@nestjs/common'
import * as ExcelJS from 'exceljs'
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
      include: { items: true },
    })
    if (!table) throw new NotFoundException('评分表不存在')

    // 计算总分
    const itemScores = dto.itemScores || {}
    let totalScore = 0
    if (table.type === 'ADD') {
      // 加分制：累加各项得分
      for (const itemId of Object.keys(itemScores)) {
        totalScore += itemScores[itemId] || 0
      }
    } else {
      // 减分制：满分减去扣分
      totalScore = table.totalScore
      for (const itemId of Object.keys(itemScores)) {
        totalScore -= itemScores[itemId] || 0
      }
    }

    return this.prisma.scoreRecord.create({
      data: {
        tableId: dto.tableId,
        judgeId,
        targetId: dto.targetId,
        totalScore,
        itemScores: itemScores,
        note: dto.note ?? null,
      },
    })
  }

  async getRecords(tenantId: string, tableId: string) {
    const table = await this.prisma.scoreTable.findFirst({
      where: { id: tableId, tenantId },
    })
    if (!table) throw new NotFoundException('评分表不存在')

    return this.prisma.scoreRecord.findMany({
      where: { tableId },
      include: {
        judge: { select: { id: true, realName: true } },
        target: { select: { id: true, realName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * 将评分表转换为考题
   * 每个评分项生成一道判断题或单选题
   */
  async convertToQuestions(tenantId: string, userId: string, tableId: string) {
    const table = await this.prisma.scoreTable.findFirst({
      where: { id: tableId, tenantId },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!table) throw new NotFoundException('评分表不存在')
    if (table.items.length === 0) throw new NotFoundException('评分表没有评分项')

    const results = { success: 0, failed: 0, questions: [] as any[] }

    for (const item of table.items) {
      try {
        // 将评分项转换为判断题
        const question = await this.prisma.question.create({
          data: {
            tenantId,
            type: 'JUDGE',
            content: `评分标准：${item.name}（分值：${item.score}分）${item.description ? ' - ' + item.description : ''}`,
            difficulty: 'MEDIUM',
            score: item.score,
            options: {
              create: [
                { label: 'A', content: '正确', isCorrect: true, sortOrder: 0 },
                { label: 'B', content: '错误', isCorrect: false, sortOrder: 1 },
              ],
            },
          },
        })
        results.success++
        results.questions.push({ id: question.id, content: question.content })
      } catch (e) {
        results.failed++
      }
    }

    return results
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

  /**
   * 导出评分记录为 Excel
   */
  async exportRecordsExcel(tenantId: string, tableId: string): Promise<StreamableFile> {
    const table = await this.prisma.scoreTable.findFirst({
      where: { id: tableId, tenantId },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!table) throw new NotFoundException('评分表不存在')

    const records = await this.prisma.scoreRecord.findMany({
      where: { tableId },
      include: {
        judge: { select: { id: true, realName: true } },
        target: { select: { id: true, realName: true, studentNo: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('评分记录')

    // 表头
    const headers = ['评分表', '被评人', '学号', '考官', '总分', '评分时间']
    // 添加评分项列名
    table.items.forEach(item => {
      headers.push(item.name)
    })
    headers.push('备注')

    sheet.columns = headers.map(h => ({ header: h, key: h, width: 15 }))

    // 数据行
    for (const record of records) {
      const row: any = {
        '评分表': table.name,
        '被评人': record.target.realName,
        '学号': record.target.studentNo ?? '',
        '考官': record.judge.realName,
        '总分': record.totalScore,
        '评分时间': new Date(record.createdAt).toLocaleString('zh-CN'),
      }

      // 添加各评分项得分
      const itemScores = record.itemScores as any || {}
      table.items.forEach(item => {
        row[item.name] = itemScores[item.id] ?? ''
      })

      row['备注'] = record.note ?? ''
      sheet.addRow(row)
    }

    const buffer = await workbook.xlsx.writeBuffer()
    return new StreamableFile(new Uint8Array(buffer), {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${table.name}-评分记录.xlsx"`,
    })
  }

  /**
   * Excel 导入评分表
   * Excel 格式：第一行表头（名称 | 类型 | 满分 | 评分项 1 | 评分项 2 | ...），从第二行开始是数据
   */
  async importExcel(tenantId: string, fileBuffer: Buffer) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(fileBuffer as any)
    const sheet = workbook.worksheets[0]
    if (!sheet) throw new BadRequestException('Excel 文件为空')

    const results = { success: 0, failed: 0, errors: [] as string[] }

    sheet.eachRow((row: any, rowNumber: number) => {
      if (rowNumber === 1) return // 跳过表头

      try {
        const name = String(row.getCell(1).value ?? '').trim()
        const typeRaw = String(row.getCell(2).value ?? 'ADD').trim()
        const type = typeRaw.includes('加') || typeRaw === 'ADD' ? 'ADD' : 'MINUS'
        const totalScore = Number(row.getCell(3).value ?? 100) || 100

        if (!name) throw new Error('评分表名称不能为空')

        // 从第 4 列开始是评分项
        const items: Array<{ name: string; score: number; sortOrder: number }> = []
        let colIndex = 4
        while (colIndex <= row.cellCount) {
          const itemName = row.getCell(colIndex)?.value?.toString()?.trim()
          if (itemName) {
            // 下一列是分值（如果有）
            const itemScore = Number(row.getCell(colIndex + 1)?.value ?? 5) || 5
            items.push({ name: itemName, score: itemScore, sortOrder: items.length })
            colIndex += 2
          } else {
            colIndex++
          }
        }

        if (items.length === 0) throw new Error('至少需要一个评分项')

        // 创建评分表
        this.prisma.scoreTable.create({
          data: {
            tenantId,
            name,
            type: type as any,
            totalScore,
            items: { create: items },
          },
        })

        results.success++
      } catch (e: any) {
        results.failed++
        results.errors.push(`第${rowNumber}行：${e.message}`)
      }
    })

    return results
  }
}
