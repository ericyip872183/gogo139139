import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ScoresService } from './scores.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@Controller('scores')
@UseGuards(AuthGuard('jwt'))
export class ScoresController {
  constructor(private service: ScoresService) {}

  // 教师端：查询考试成绩列表
  @Get('exam/:examId')
  findByExam(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('examId') examId: string,
  ) {
    return this.service.findByExam(user.tenantId, examId)
  }

  // 教师端：考试统计
  @Get('exam/:examId/stats')
  getExamStats(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('examId') examId: string,
  ) {
    return this.service.getExamStats(user.tenantId, examId)
  }

  // 学生端：我的成绩
  @Get('my')
  findMyScores(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.service.findMyScores(user.id, user.tenantId)
  }

  // 答题明细（学生和教师均可查）
  @Get('exam/:examId/detail/:userId')
  getAnswerDetail(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('examId') examId: string,
    @Param('userId') userId: string,
  ) {
    return this.service.getAnswerDetail(userId, examId, user.tenantId)
  }
}
