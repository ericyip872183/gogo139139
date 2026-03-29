import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreatePaperDto, UpdatePaperDto, QueryPaperDto } from './dto/paper.dto'

@Injectable()
export class PapersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: QueryPaperDto) {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const skip = (page - 1) * pageSize
    const where: any = { tenantId, isActive: true }
    if (query.keyword) where.title = { contains: query.keyword }

    const [total, list] = await Promise.all([
      this.prisma.paper.count({ where }),
      this.prisma.paper.findMany({
        where, skip, take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { paperQuestions: true } },
        },
      }),
    ])
    return { total, list, page, pageSize }
  }

  async findOne(tenantId: string, id: string) {
    const paper = await this.prisma.paper.findFirst({
      where: { id, tenantId, isActive: true },
      include: {
        paperQuestions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            question: {
              include: {
                options: { orderBy: { sortOrder: 'asc' } },
                mediaItems: { orderBy: { sortOrder: 'asc' } },
              },
            },
          },
        },
      },
    })
    if (!paper) throw new NotFoundException('试卷不存在')
    return paper
  }

  async create(tenantId: string, dto: CreatePaperDto) {
    if (!dto.questions?.length) throw new BadRequestException('试卷至少包含一道题目')

    return this.prisma.$transaction(async (tx) => {
      // 查询题目信息，计算总分
      const questions = await tx.question.findMany({
        where: { id: { in: dto.questions.map(q => q.questionId) }, tenantId },
        select: { id: true, score: true },
      })
      if (questions.length !== dto.questions.length) {
        throw new BadRequestException('部分题目不存在或不属于本机构')
      }

      const qMap = new Map(questions.map(q => [q.id, q.score]))
      const totalScore = dto.questions.reduce((sum, q) => {
        return sum + (q.score ?? qMap.get(q.questionId) ?? 1)
      }, 0)

      const paper = await tx.paper.create({
        data: {
          tenantId,
          title: dto.title,
          description: dto.description ?? null,
          duration: dto.duration ?? 60,
          totalScore,
        },
      })

      await tx.paperQuestion.createMany({
        data: dto.questions.map((q, i) => ({
          paperId: paper.id,
          questionId: q.questionId,
          sortOrder: i,
          score: q.score ?? null,
        })),
      })

      return paper
    })
  }

  async update(tenantId: string, id: string, dto: UpdatePaperDto) {
    await this._findOrFail(tenantId, id)

    return this.prisma.$transaction(async (tx) => {
      const { questions, ...rest } = dto

      let totalScore: number | undefined
      if (questions !== undefined) {
        const qData = await tx.question.findMany({
          where: { id: { in: questions.map(q => q.questionId) }, tenantId },
          select: { id: true, score: true },
        })
        const qMap = new Map(qData.map(q => [q.id, q.score]))
        totalScore = questions.reduce((sum, q) => sum + (q.score ?? qMap.get(q.questionId) ?? 1), 0)

        await tx.paperQuestion.deleteMany({ where: { paperId: id } })
        if (questions.length) {
          await tx.paperQuestion.createMany({
            data: questions.map((q, i) => ({
              paperId: id,
              questionId: q.questionId,
              sortOrder: i,
              score: q.score ?? null,
            })),
          })
        }
      }

      return tx.paper.update({
        where: { id },
        data: { ...rest, ...(totalScore !== undefined ? { totalScore } : {}) },
      })
    })
  }

  async remove(tenantId: string, id: string) {
    const paper = await this._findOrFail(tenantId, id)

    // 查询引用该试卷的所有考试
    const exams = await this.prisma.exam.findMany({
      where: { paperId: id, tenantId },
      include: {
        participants: {
          select: {
            hasSubmitted: true,
          },
        },
      },
    })

    if (exams.length > 0) {
      throw new BadRequestException({
        code: 'PAPER_IN_USE',
        message: `该试卷被 ${exams.length} 个考试引用，无法删除`,
        exams: exams.map(e => ({
          id: e.id,
          title: e.title,
          status: e.status,
          participantCount: e.participants.length,
          submittedCount: e.participants.filter(p => p.hasSubmitted).length,
        })),
      })
    }

    // 软删除试卷
    return this.prisma.paper.update({ where: { id }, data: { isActive: false } })
  }

  private async _findOrFail(tenantId: string, id: string) {
    const p = await this.prisma.paper.findFirst({ where: { id, tenantId } })
    if (!p) throw new NotFoundException('试卷不存在')
    return p
  }
}
