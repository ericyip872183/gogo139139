import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { SaveAnswerDto } from './dto/exam-room.dto'
import { ExamStatus } from '@prisma/client'

@Injectable()
export class ExamRoomService {
  constructor(private prisma: PrismaService) {}

  /** 学生进入考试，返回试题（不含答案） */
  async enter(userId: string, examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        paper: {
          include: {
            paperQuestions: {
              orderBy: { sortOrder: 'asc' },
              include: {
                question: {
                  select: {
                    id: true, type: true, content: true, score: true,
                    // 选项不含 isCorrect
                    options: {
                      select: { id: true, label: true, content: true, sortOrder: true },
                      orderBy: { sortOrder: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })
    if (!exam) throw new NotFoundException('考试不存在')
    if (exam.status === ExamStatus.CANCELLED) throw new ForbiddenException('考试已取消')
    if (exam.status === ExamStatus.ENDED) throw new ForbiddenException('考试已结束')

    // 检查是否有参与资格
    const participant = await this.prisma.examParticipant.findUnique({
      where: { examId_userId: { examId, userId } },
    })
    if (!participant) throw new ForbiddenException('您没有参加此考试的资格')
    if (participant.hasSubmitted) throw new ForbiddenException('您已提交答卷')

    // 获取已保存的答案
    const savedAnswers = await this.prisma.examAnswer.findMany({
      where: { examId, userId },
      select: { questionId: true, answer: true },
    })
    const answerMap: Record<string, string> = {}
    savedAnswers.forEach(a => { answerMap[a.questionId] = a.answer })

    const duration = exam.duration ?? exam.paper.duration

    return {
      examId: exam.id,
      title: exam.title,
      duration,
      startAt: exam.startAt,
      endAt: exam.endAt,
      maxSwitch: exam.maxSwitch,
      switchCount: participant.switchCount,
      totalScore: exam.paper.totalScore,
      questions: exam.paper.paperQuestions.map(pq => ({
        ...pq.question,
        paperScore: pq.score ?? pq.question.score,
        savedAnswer: answerMap[pq.question.id] ?? null,
      })),
    }
  }

  /** 保存单题答案（实时） */
  async saveAnswer(userId: string, examId: string, dto: SaveAnswerDto) {
    const participant = await this._checkActive(userId, examId)
    if (!participant) throw new ForbiddenException('无权操作')

    return this.prisma.examAnswer.upsert({
      where: { examId_userId_questionId: { examId, userId, questionId: dto.questionId } },
      create: { examId, userId, questionId: dto.questionId, answer: dto.answer },
      update: { answer: dto.answer },
    })
  }

  /** 记录切屏 */
  async recordSwitch(userId: string, examId: string) {
    const participant = await this._checkActive(userId, examId)
    if (!participant) return

    const updated = await this.prisma.examParticipant.update({
      where: { examId_userId: { examId, userId } },
      data: { switchCount: { increment: 1 } },
    })

    // 超出最大切屏次数，强制交卷
    const exam = await this.prisma.exam.findUnique({ where: { id: examId }, select: { maxSwitch: true } })
    if (exam && updated.switchCount >= exam.maxSwitch) {
      await this._doSubmit(userId, examId)
      return { forceSubmit: true, switchCount: updated.switchCount }
    }
    return { forceSubmit: false, switchCount: updated.switchCount }
  }

  /** 交卷 */
  async submit(userId: string, examId: string) {
    await this._checkActive(userId, examId)
    return this._doSubmit(userId, examId)
  }

  private async _doSubmit(userId: string, examId: string) {
    await this.prisma.examParticipant.update({
      where: { examId_userId: { examId, userId } },
      data: { hasSubmitted: true, submittedAt: new Date() },
    })

    // 触发自动阅卷（异步，不等待）
    this._autoGrade(userId, examId).catch(() => {})

    return { success: true }
  }

  /** 自动阅卷 */
  private async _autoGrade(userId: string, examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        paper: {
          include: {
            paperQuestions: {
              include: {
                question: { include: { options: true } },
              },
            },
          },
        },
      },
    })
    if (!exam) return

    const answers = await this.prisma.examAnswer.findMany({ where: { examId, userId } })
    const answerMap: Record<string, string> = {}
    answers.forEach(a => { answerMap[a.questionId] = a.answer })

    let totalScore = 0
    let maxScore = 0

    for (const pq of exam.paper.paperQuestions) {
      const q = pq.question
      const qScore = pq.score ?? q.score
      maxScore += qScore
      const userAnswer = answerMap[q.id]
      if (!userAnswer) continue

      let isCorrect = false
      if (q.type === 'SINGLE' || q.type === 'JUDGE') {
        const correct = q.options.find(o => o.isCorrect)?.label
        isCorrect = userAnswer === correct
      } else if (q.type === 'MULTIPLE') {
        const correctSet = new Set(q.options.filter(o => o.isCorrect).map(o => o.label))
        try {
          const userSet = new Set(JSON.parse(userAnswer) as string[])
          isCorrect = correctSet.size === userSet.size && [...correctSet].every(c => userSet.has(c))
        } catch { isCorrect = false }
      } else if (q.type === 'FILL') {
        const correct = q.options.find(o => o.isCorrect)?.content ?? ''
        isCorrect = userAnswer.trim() === correct.trim()
      }

      const earned = isCorrect ? qScore : 0
      totalScore += earned

      await this.prisma.examAnswer.update({
        where: { examId_userId_questionId: { examId, userId, questionId: q.id } },
        data: { isCorrect, score: earned },
      })
    }

    const correctRate = maxScore > 0 ? totalScore / maxScore : 0

    await this.prisma.score.upsert({
      where: { examId_userId: { examId, userId } },
      create: { examId, userId, totalScore, maxScore, correctRate },
      update: { totalScore, maxScore, correctRate },
    })

    // 更新排名
    await this._updateRanks(examId)
  }

  private async _updateRanks(examId: string) {
    const scores = await this.prisma.score.findMany({
      where: { examId },
      orderBy: { totalScore: 'desc' },
    })
    for (let i = 0; i < scores.length; i++) {
      await this.prisma.score.update({
        where: { id: scores[i].id },
        data: { rank: i + 1 },
      })
    }
  }

  private async _checkActive(userId: string, examId: string) {
    const participant = await this.prisma.examParticipant.findUnique({
      where: { examId_userId: { examId, userId } },
    })
    if (!participant || participant.hasSubmitted) return null
    return participant
  }
}
