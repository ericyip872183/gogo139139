import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { QueryScoreDto } from './dto/score.dto'

@Injectable()
export class ScoresService {
  constructor(private prisma: PrismaService) {}

  // 教师端：查询某次考试的成绩列表
  async findByExam(tenantId: string, examId: string) {
    // 验证考试属于该机构
    const exam = await this.prisma.exam.findFirst({ where: { id: examId, tenantId } })
    if (!exam) throw new NotFoundException('考试不存在')

    const scores = await this.prisma.score.findMany({
      where: { examId },
      include: {
        user: { select: { id: true, realName: true, studentNo: true } },
      },
      orderBy: [{ rank: 'asc' }, { totalScore: 'desc' }],
    })

    const exam2 = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { paper: { select: { totalScore: true, title: true } } },
    })

    return {
      exam: {
        id: exam2!.id,
        title: exam2!.title,
        totalScore: exam2!.paper.totalScore,
      },
      list: scores.map(s => ({
        userId: s.userId,
        realName: s.user.realName,
        studentNo: s.user.studentNo,
        totalScore: s.totalScore,
        maxScore: s.maxScore,
        correctRate: Math.round(s.correctRate * 100),
        rank: s.rank,
        createdAt: s.createdAt,
      })),
    }
  }

  // 成绩统计（教师端）
  async getExamStats(tenantId: string, examId: string) {
    const exam = await this.prisma.exam.findFirst({ where: { id: examId, tenantId } })
    if (!exam) throw new NotFoundException('考试不存在')

    const scores = await this.prisma.score.findMany({ where: { examId } })
    if (scores.length === 0) return { count: 0, avg: 0, max: 0, min: 0, passRate: 0 }

    const totals = scores.map(s => s.totalScore)
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length
    const max = Math.max(...totals)
    const min = Math.min(...totals)
    const passing = totals.filter(s => s >= scores[0].maxScore * 0.6).length
    return {
      count: scores.length,
      avg: Math.round(avg * 10) / 10,
      max,
      min,
      passRate: Math.round((passing / scores.length) * 100),
    }
  }

  // 学生端：查询个人成绩列表
  async findMyScores(userId: string, tenantId: string) {
    const scores = await this.prisma.score.findMany({
      where: { userId, exam: { tenantId } },
      include: {
        exam: { select: { id: true, title: true, startAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return scores.map(s => ({
      id: s.id,
      examId: s.examId,
      examTitle: s.exam.title,
      examDate: s.exam.startAt,
      totalScore: s.totalScore,
      maxScore: s.maxScore,
      correctRate: Math.round(s.correctRate * 100),
      rank: s.rank,
      createdAt: s.createdAt,
    }))
  }

  // 答题明细
  async getAnswerDetail(userId: string, examId: string, tenantId: string) {
    const exam = await this.prisma.exam.findFirst({ where: { id: examId, tenantId } })
    if (!exam) throw new NotFoundException('考试不存在')

    const answers = await this.prisma.examAnswer.findMany({
      where: { examId, userId },
      include: {
        question: {
          include: { options: { orderBy: { sortOrder: 'asc' } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return answers.map(a => ({
      questionId: a.questionId,
      content: a.question.content,
      type: a.question.type,
      options: a.question.options,
      myAnswer: a.answer,
      isCorrect: a.isCorrect,
      score: a.score,
      explanation: a.question.explanation,
    }))
  }
}
