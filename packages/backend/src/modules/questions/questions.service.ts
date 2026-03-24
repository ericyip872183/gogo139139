import {
  Injectable,
  NotFoundException,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common'
import * as ExcelJS from 'exceljs'
import { PrismaService } from '../../prisma/prisma.service'
import {
  CreateCategoryDto, UpdateCategoryDto,
  CreateQuestionDto, UpdateQuestionDto, QueryQuestionDto, ImportQuestionDto,
} from './dto/question.dto'
import { QuestionType, Difficulty } from '@prisma/client'

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  // ─── 分类 ────────────────────────────────────────────

  async getCategoryTree(tenantId: string) {
    const all = await this.prisma.questionCategory.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return this._buildCategoryTree(all, null)
  }

  async getCategoryList(tenantId: string) {
    return this.prisma.questionCategory.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, name: true, parentId: true, moduleType: true },
    })
  }

  async createCategory(tenantId: string, dto: CreateCategoryDto) {
    if (dto.parentId) {
      const parent = await this.prisma.questionCategory.findFirst({
        where: { id: dto.parentId, tenantId },
      })
      if (!parent) throw new NotFoundException('父级分类不存在')
    }
    return this.prisma.questionCategory.create({
      data: {
        tenantId,
        name: dto.name,
        parentId: dto.parentId ?? null,
        moduleType: dto.moduleType ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
    })
  }

  async updateCategory(tenantId: string, id: string, dto: UpdateCategoryDto) {
    await this._findCategoryOrFail(tenantId, id)
    return this.prisma.questionCategory.update({ where: { id }, data: dto })
  }

  async removeCategory(tenantId: string, id: string) {
    await this._findCategoryOrFail(tenantId, id)
    const hasChildren = await this.prisma.questionCategory.count({
      where: { parentId: id },
    })
    if (hasChildren > 0) throw new BadRequestException('请先删除子分类')
    const hasQuestions = await this.prisma.question.count({
      where: { categoryId: id, isActive: true },
    })
    if (hasQuestions > 0) throw new BadRequestException('该分类下还有题目，请先移除')
    return this.prisma.questionCategory.delete({ where: { id } })
  }

  // ─── 题目 ────────────────────────────────────────────

  async findAll(tenantId: string, query: QueryQuestionDto) {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const skip = (page - 1) * pageSize

    const where: any = { tenantId, isActive: true }
    if (query.keyword) {
      where.content = { contains: query.keyword }
    }
    if (query.categoryId) where.categoryId = query.categoryId
    if (query.type) where.type = query.type
    if (query.difficulty) where.difficulty = query.difficulty

    const [total, list] = await Promise.all([
      this.prisma.question.count({ where }),
      this.prisma.question.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          options: { orderBy: { sortOrder: 'asc' } },
          category: { select: { id: true, name: true } },
        },
      }),
    ])

    return { total, list, page, pageSize }
  }

  async findOne(tenantId: string, id: string) {
    const q = await this.prisma.question.findFirst({
      where: { id, tenantId, isActive: true },
      include: {
        options: { orderBy: { sortOrder: 'asc' } },
        category: { select: { id: true, name: true } },
      },
    })
    if (!q) throw new NotFoundException('题目不存在')
    return q
  }

  async create(tenantId: string, dto: CreateQuestionDto) {
    this._validateOptions(dto.type, dto.options)
    return this.prisma.$transaction(async (tx) => {
      const q = await tx.question.create({
        data: {
          tenantId,
          type: dto.type,
          content: dto.content,
          categoryId: dto.categoryId ?? null,
          difficulty: dto.difficulty ?? Difficulty.MEDIUM,
          score: dto.score ?? 1,
          explanation: dto.explanation ?? null,
        },
      })
      if (dto.options?.length) {
        await tx.questionOption.createMany({
          data: dto.options.map((o, i) => ({
            questionId: q.id,
            label: o.label,
            content: o.content,
            isCorrect: o.isCorrect,
            sortOrder: o.sortOrder ?? i,
          })),
        })
      }
      return q
    })
  }

  async update(tenantId: string, id: string, dto: UpdateQuestionDto) {
    const q = await this._findOrFail(tenantId, id)
    if (dto.options !== undefined) {
      this._validateOptions(q.type, dto.options)
    }
    return this.prisma.$transaction(async (tx) => {
      const { options, ...rest } = dto
      const updated = await tx.question.update({ where: { id }, data: rest })
      if (options !== undefined) {
        await tx.questionOption.deleteMany({ where: { questionId: id } })
        if (options.length) {
          await tx.questionOption.createMany({
            data: options.map((o, i) => ({
              questionId: id,
              label: o.label,
              content: o.content,
              isCorrect: o.isCorrect,
              sortOrder: o.sortOrder ?? i,
            })),
          })
        }
      }
      return updated
    })
  }

  async remove(tenantId: string, id: string) {
    await this._findOrFail(tenantId, id)
    return this.prisma.question.update({
      where: { id },
      data: { isActive: false },
    })
  }

  async batchRemove(tenantId: string, ids: string[]) {
    return this.prisma.question.updateMany({
      where: { id: { in: ids }, tenantId },
      data: { isActive: false },
    })
  }

  async batchImport(tenantId: string, rows: ImportQuestionDto[]) {
    const results = { success: 0, failed: 0, errors: [] as string[] }

    for (const row of rows) {
      try {
        // 查找分类
        let categoryId: string | null = null
        if (row.categoryName) {
          const cat = await this.prisma.questionCategory.findFirst({
            where: { tenantId, name: row.categoryName },
          })
          if (cat) categoryId = cat.id
        }

        // 构造选项
        let options = row.options ?? []
        if (row.type === QuestionType.JUDGE && options.length === 0) {
          options = [
            { label: 'A', content: '正确', isCorrect: row.answer === true, sortOrder: 0 },
            { label: 'B', content: '错误', isCorrect: row.answer === false, sortOrder: 1 },
          ]
        }
        if (row.type === QuestionType.FILL && options.length === 0 && row.fillAnswer) {
          options = [{ label: '1', content: row.fillAnswer, isCorrect: true, sortOrder: 0 }]
        }

        await this.prisma.$transaction(async (tx) => {
          const q = await tx.question.create({
            data: {
              tenantId,
              type: row.type,
              content: row.content,
              categoryId,
              difficulty: row.difficulty ?? Difficulty.MEDIUM,
              score: row.score ?? 1,
              explanation: row.explanation ?? null,
            },
          })
          if (options.length) {
            await tx.questionOption.createMany({
              data: options.map((o, i) => ({
                questionId: q.id,
                label: o.label,
                content: o.content,
                isCorrect: o.isCorrect,
                sortOrder: o.sortOrder ?? i,
              })),
            })
          }
        })

        results.success++
      } catch {
        results.failed++
        results.errors.push(`第${results.success + results.failed}题导入失败`)
      }
    }

    return results
  }

  // ── Excel 导出 ──────────────────────────────────────

  async exportExcel(tenantId: string, query: QueryQuestionDto): Promise<StreamableFile> {
    const q = { ...query, page: 1, pageSize: 10000 }
    const { list } = await this.findAll(tenantId, q)

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('题目列表')
    sheet.columns = [
      { header: '题型', key: 'type', width: 10 },
      { header: '题目内容', key: 'content', width: 60 },
      { header: '难度', key: 'difficulty', width: 10 },
      { header: '分值', key: 'score', width: 8 },
      { header: '分类', key: 'category', width: 20 },
      { header: '答案', key: 'answer', width: 20 },
      { header: '解析', key: 'explanation', width: 40 },
    ]

    const typeMap: Record<string, string> = {
      SINGLE: '单选题', MULTIPLE: '多选题', JUDGE: '判断题', FILL: '填空题',
    }
    const difficultyMap: Record<string, string> = {
      EASY: '易', MEDIUM: '中', HARD: '难',
    }

    for (const q of list as any[]) {
      let answer = ''
      if (q.type === 'JUDGE') {
        answer = q.options.find((o: any) => o.isCorrect)?.label === 'A' ? '正确' : '错误'
      } else if (q.type === 'FILL') {
        answer = q.options[0]?.content ?? ''
      } else {
        answer = q.options.filter((o: any) => o.isCorrect).map((o: any) => o.label).join(',')
      }

      sheet.addRow({
        type: typeMap[q.type] ?? q.type,
        content: q.content.replace(/<[^>]+>/g, '').slice(0, 200),
        difficulty: difficultyMap[q.difficulty] ?? q.difficulty,
        score: q.score,
        category: q.category?.name ?? '',
        answer,
        explanation: q.explanation ? q.explanation.replace(/<[^>]+>/g, '').slice(0, 100) : '',
      })
    }

    const buffer = await workbook.xlsx.writeBuffer()
    return new StreamableFile(new Uint8Array(buffer), {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: 'attachment; filename="题目导出.xlsx"',
    })
  }

  // ── Excel 导入 ──────────────────────────────────────

  async importExcel(tenantId: string, fileBuffer: Buffer, categoryId?: string) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(fileBuffer as any)
    const sheet = workbook.worksheets[0]
    if (!sheet) throw new BadRequestException('Excel 文件为空')

    const rows: ImportQuestionDto[] = []

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const typeRaw = String(row.getCell(1).value ?? '单选题').trim()
      const type = typeRaw.includes('单') ? QuestionType.SINGLE
        : typeRaw.includes('多') ? QuestionType.MULTIPLE
        : typeRaw.includes('判') ? QuestionType.JUDGE
        : typeRaw.includes('填') ? QuestionType.FILL
        : QuestionType.SINGLE

      const content = String(row.getCell(2).value ?? '').trim()
      const difficultyRaw = String(row.getCell(3).value ?? '中').trim()
      const difficulty = difficultyRaw.includes('易') ? Difficulty.EASY
        : difficultyRaw.includes('难') ? Difficulty.HARD
        : Difficulty.MEDIUM
      const score = Number(row.getCell(4).value ?? 1) || 1
      const answerRaw = String(row.getCell(6).value ?? '').trim()
      const explanation = String(row.getCell(7).value ?? '').trim()

      let options: any[] = []
      let fillAnswer = ''

      if (type === QuestionType.JUDGE) {
        options = [
          { label: 'A', content: '正确', isCorrect: answerRaw.includes('正确'), sortOrder: 0 },
          { label: 'B', content: '错误', isCorrect: !answerRaw.includes('正确'), sortOrder: 1 },
        ]
      } else if (type === QuestionType.FILL) {
        fillAnswer = answerRaw
        options = [{ label: '1', content: answerRaw, isCorrect: true, sortOrder: 0 }]
      } else {
        const labels = answerRaw.split(/[,,]/).map((s: string) => s.trim().toUpperCase())
        for (let i = 0; i < 4; i++) {
          const label = String.fromCharCode(65 + i)
          options.push({
            label,
            content: String(row.getCell(8 + i).value ?? '').trim(),
            isCorrect: labels.includes(label),
            sortOrder: i,
          })
        }
      }

      if (content) {
        rows.push({
          type, content, difficulty, score,
          categoryId, options, explanation: explanation || undefined,
          fillAnswer: fillAnswer || undefined,
        })
      }
    })

    return this.batchImport(tenantId, rows)
  }

  // ─── 私有方法 ─────────────────────────────────────────

  private _validateOptions(type: QuestionType, options: any[]) {
    if (type === QuestionType.SINGLE || type === QuestionType.MULTIPLE) {
      if (!options?.length) {
        throw new BadRequestException('选择题必须填写选项')
      }
      const hasCorrect = options.some((o) => o.isCorrect)
      if (!hasCorrect) {
        throw new BadRequestException('必须至少指定一个正确选项')
      }
    }
  }

  private async _findOrFail(tenantId: string, id: string) {
    const q = await this.prisma.question.findFirst({
      where: { id, tenantId },
    })
    if (!q) throw new NotFoundException('题目不存在')
    return q
  }

  private async _findCategoryOrFail(tenantId: string, id: string) {
    const cat = await this.prisma.questionCategory.findFirst({
      where: { id, tenantId },
    })
    if (!cat) throw new NotFoundException('分类不存在')
    return cat
  }

  private _buildCategoryTree(list: any[], parentId: string | null): any[] {
    return list
      .filter((item) => item.parentId === parentId)
      .map((item) => ({
        ...item,
        children: this._buildCategoryTree(list, item.id),
      }))
  }
}
