import { Module, OnModuleInit } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { ExamRoomService } from './exam-room.service'

/**
 * 考试超时自动提交定时任务
 * 每分钟扫描一次，自动提交超时未交卷的考试
 */
@Module({
  providers: [ExamTimeoutTask],
  exports: [ExamTimeoutTask],
})
export class ExamTimeoutTask implements OnModuleInit {
  private timer: NodeJS.Timeout | null = null

  constructor(
    private prisma: PrismaService,
    private examRoomService: ExamRoomService,
  ) {}

  onModuleInit() {
    // 启动定时任务（每 60 秒执行一次）
    this.timer = setInterval(() => this.checkTimeoutExams(), 60000)
    // 首次启动时立即执行一次
    setTimeout(() => this.checkTimeoutExams(), 5000)
  }

  /**
   * 扫描超时考试
   */
  async checkTimeoutExams() {
    const now = new Date()

    // 查找所有进行中的考试
    const exams = await this.prisma.exam.findMany({
      where: {
        status: 'ONGOING',
        endAt: { lte: now }, // 结束时间已过
      },
      select: { id: true, title: true, tenantId: true },
    })

    for (const exam of exams) {
      // 查找该考试中已参与但未交卷的学生
      const participants = await this.prisma.examParticipant.findMany({
        where: {
          examId: exam.id,
          hasSubmitted: false,
        },
        select: { userId: true },
      })

      for (const p of participants) {
        try {
          // 自动提交
          await this.examRoomService.submit(p.userId, exam.id)
          console.log(`[自动交卷] 考试"${exam.title}" 用户${p.userId} 已自动提交`)
        } catch (e) {
          console.error(`[自动交卷失败] 考试"${exam.title}" 用户${p.userId}`, e)
        }
      }
    }
  }

  /**
   * 停止定时任务
   */
  onDestroy() {
    if (this.timer) {
      clearInterval(this.timer)
    }
  }
}
