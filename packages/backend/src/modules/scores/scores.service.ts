import { Injectable, NotFoundException, ForbiddenException, StreamableFile } from '@nestjs/common'
import ExcelJS from 'exceljs'
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

  // Excel 导出
  async exportExcel(tenantId: string, examId: string): Promise<StreamableFile> {
    const result = await this.findByExam(tenantId, examId)
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { paper: { select: { totalScore: true, title: true } } },
    })
    if (!exam) throw new NotFoundException('考试不存在')

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('成绩列表')
    sheet.columns = [
      { header: '姓名', key: 'realName', width: 15 },
      { header: '学号', key: 'studentNo', width: 15 },
      { header: '总分', key: 'totalScore', width: 10 },
      { header: '满分', key: 'maxScore', width: 10 },
      { header: '正确率', key: 'correctRate', width: 10 },
      { header: '排名', key: 'rank', width: 8 },
      { header: '交卷时间', key: 'createdAt', width: 20 },
    ]

    for (const s of result.list as any[]) {
      sheet.addRow({
        realName: s.realName,
        studentNo: s.studentNo ?? '',
        totalScore: s.totalScore,
        maxScore: s.maxScore,
        correctRate: s.correctRate + '%',
        rank: s.rank ?? '',
        createdAt: s.createdAt ? new Date(s.createdAt).toLocaleString('zh-CN') : '',
      })
    }

    // 添加统计信息
    const stats = await this.getExamStats(tenantId, examId)
    const statsSheet = workbook.addWorksheet('统计')
    statsSheet.addRow(['考试标题', exam.paper?.title ?? ''])
    statsSheet.addRow(['满分', exam.paper?.totalScore ?? 0])
    statsSheet.addRow(['参考人数', stats.count])
    statsSheet.addRow(['平均分', stats.avg])
    statsSheet.addRow(['最高分', stats.max])
    statsSheet.addRow(['最低分', stats.min])
    statsSheet.addRow(['及格率', stats.passRate + '%'])

    const buffer = await workbook.xlsx.writeBuffer()
    return new StreamableFile(new Uint8Array(buffer as any), {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="成绩-${examId}.xlsx"`,
    })
  }

  // 教师端：手动修改分数
  async updateScore(tenantId: string, id: string, totalScore: number, comment?: string) {
    const score = await this.prisma.score.findFirst({
      where: { id },
      include: { exam: { select: { tenantId: true } } },
    })
    if (!score) throw new NotFoundException('成绩记录不存在')
    if (score.exam.tenantId !== tenantId) throw new ForbiddenException('无权修改此成绩')

    // 计算新的正确率
    const maxScore = score.maxScore
    const correctRate = maxScore > 0 ? totalScore / maxScore : 0

    return this.prisma.score.update({
      where: { id },
      data: {
        totalScore,
        correctRate,
        comment: comment ?? null,
      },
    })
  }
}
