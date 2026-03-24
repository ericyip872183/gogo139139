import { Controller, Get, Param, UseGuards, Res, Patch, Body } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ScoresService } from './scores.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Response } from 'express'

@Controller('scores')
@UseGuards(AuthGuard('jwt'), RolesGuard)
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

  // 教师端：考试成绩导出
  @Get('exam/:examId/export')
  async exportExcel(
    @CurrentUser() user: { tenantId: string },
    @Param('examId') examId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="成绩-${examId}.xlsx"`,
    })
    return this.service.exportExcel(user.tenantId, examId)
  }

  // 教师端：考试统计
  @Get('exam/:examId/stats')
  getExamStats(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('examId') examId: string,
  ) {
    return this.service.getExamStats(user.tenantId, examId)
  }

  // 教师端：手动修改分数
  @Patch(':id')
  @Roles('TEACHER', 'TENANT_ADMIN', 'CLASS_ADMIN', 'SUPER_ADMIN')
  updateScore(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
    @Body() body: { totalScore: number; comment?: string },
  ) {
    return this.service.updateScore(user.tenantId, id, body.totalScore, body.comment)
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
