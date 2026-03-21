import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateExamDto, UpdateExamDto, QueryExamDto, AddParticipantsDto } from './dto/exam.dto'
import { ExamStatus } from '@prisma/client'

@Injectable()
export class ExamsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: QueryExamDto) {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const skip = (page - 1) * pageSize
    const where: any = { tenantId }
    if (query.keyword) where.title = { contains: query.keyword }
    if (query.status) where.status = query.status

    const [total, list] = await Promise.all([
      this.prisma.exam.count({ where }),
      this.prisma.exam.findMany({
        where, skip, take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          paper: { select: { id: true, title: true, totalScore: true } },
          _count: { select: { participants: true } },
        },
      }),
    ])
    return { total, list, page, pageSize }
  }

  async findOne(tenantId: string, id: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id, tenantId },
      include: {
        paper: {
          include: {
            paperQuestions: {
              orderBy: { sortOrder: 'asc' },
              include: { question: { include: { options: { orderBy: { sortOrder: 'asc' } } } } },
            },
          },
        },
        _count: { select: { participants: true } },
      },
    })
    if (!exam) throw new NotFoundException('考试不存在')
    return exam
  }

  async create(tenantId: string, dto: CreateExamDto) {
    const paper = await this.prisma.paper.findFirst({ where: { id: dto.paperId, tenantId } })
    if (!paper) throw new NotFoundException('试卷不存在')

    return this.prisma.$transaction(async (tx) => {
      const exam = await tx.exam.create({
        data: {
          tenantId,
          paperId: dto.paperId,
          title: dto.title,
          description: dto.description ?? null,
          startAt: dto.startAt ? new Date(dto.startAt) : null,
          endAt: dto.endAt ? new Date(dto.endAt) : null,
          duration: dto.duration ?? null,
          maxSwitch: dto.maxSwitch ?? 3,
          status: ExamStatus.DRAFT,
        },
      })

      await this._assignParticipants(tx, tenantId, exam.id, dto.participantIds, dto.organizationIds)
      return exam
    })
  }

  async update(tenantId: string, id: string, dto: UpdateExamDto) {
    const exam = await this._findOrFail(tenantId, id)
    if (exam.status === ExamStatus.ENDED || exam.status === ExamStatus.CANCELLED) {
      throw new BadRequestException('已结束或取消的考试无法修改')
    }
    return this.prisma.exam.update({
      where: { id },
      data: {
        ...dto,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
      },
    })
  }

  async publish(tenantId: string, id: string) {
    const exam = await this._findOrFail(tenantId, id)
    if (exam.status !== ExamStatus.DRAFT) throw new BadRequestException('只有草稿状态可发布')
    return this.prisma.exam.update({ where: { id }, data: { status: ExamStatus.PUBLISHED } })
  }

  async cancel(tenantId: string, id: string) {
    const exam = await this._findOrFail(tenantId, id)
    if (exam.status === ExamStatus.ENDED) throw new BadRequestException('考试已结束')
    return this.prisma.exam.update({ where: { id }, data: { status: ExamStatus.CANCELLED } })
  }

  async addParticipants(tenantId: string, id: string, dto: AddParticipantsDto) {
    await this._findOrFail(tenantId, id)
    return this.prisma.$transaction(async (tx) => {
      await this._assignParticipants(tx, tenantId, id, dto.userIds, dto.organizationIds)
    })
  }

  async removeParticipant(tenantId: string, id: string, userId: string) {
    await this._findOrFail(tenantId, id)
    return this.prisma.examParticipant.deleteMany({ where: { examId: id, userId } })
  }

  async getParticipants(tenantId: string, id: string) {
    await this._findOrFail(tenantId, id)
    return this.prisma.examParticipant.findMany({
      where: { examId: id },
      include: {
        user: { select: { id: true, realName: true, username: true, studentNo: true } },
      },
    })
  }

  // 学生端：获取自己的待考/已考列表（扁平化返回，含 hasSubmitted）
  async findForStudent(userId: string, tenantId: string) {
    const participations: any[] = await this.prisma.examParticipant.findMany({
      where: { userId },
      include: {
        exam: {
          include: {
            paper: { select: { title: true, totalScore: true, duration: true } },
          },
        },
      },
      orderBy: { exam: { startAt: 'desc' } },
    })
    return participations.map((p: any) => ({
      id:           p.exam.id,
      title:        p.exam.title,
      description:  p.exam.description,
      status:       p.exam.status,
      startAt:      p.exam.startAt,
      endAt:        p.exam.endAt,
      duration:     p.exam.duration ?? p.exam.paper?.duration,
      maxSwitch:    p.exam.maxSwitch,
      paper:        p.exam.paper,
      hasSubmitted: p.hasSubmitted,
      switchCount:  p.switchCount,
      submittedAt:  p.submittedAt,
    }))
  }

  private async _assignParticipants(
    tx: any,
    tenantId: string,
    examId: string,
    userIds?: string[],
    orgIds?: string[],
  ) {
    const ids = new Set<string>(userIds ?? [])

    if (orgIds?.length) {
      const orgUsers = await tx.userOrg.findMany({
        where: { organizationId: { in: orgIds } },
        select: { userId: true },
      })
      orgUsers.forEach((u: any) => ids.add(u.userId))
    }

    if (ids.size === 0) return

    // 过滤已存在的
    const existing = await tx.examParticipant.findMany({
      where: { examId, userId: { in: Array.from(ids) } },
      select: { userId: true },
    })
    const existingSet = new Set(existing.map((e: any) => e.userId))
    const newIds = Array.from(ids).filter(id => !existingSet.has(id))

    if (newIds.length) {
      await tx.examParticipant.createMany({
        data: newIds.map(userId => ({ examId, userId })),
      })
    }
  }

  private async _findOrFail(tenantId: string, id: string) {
    const exam = await this.prisma.exam.findFirst({ where: { id, tenantId } })
    if (!exam) throw new NotFoundException('考试不存在')
    return exam
  }
}
