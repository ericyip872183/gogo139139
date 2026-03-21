import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ExamRoomService } from './exam-room.service'
import { SaveAnswerDto } from './dto/exam-room.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@Controller('exam-room')
@UseGuards(AuthGuard('jwt'))
export class ExamRoomController {
  constructor(private service: ExamRoomService) {}

  @Get(':examId')
  enter(@CurrentUser() user: { id: string }, @Param('examId') examId: string) {
    return this.service.enter(user.id, examId)
  }

  @Post(':examId/answer')
  saveAnswer(
    @CurrentUser() user: { id: string },
    @Param('examId') examId: string,
    @Body() dto: SaveAnswerDto,
  ) {
    return this.service.saveAnswer(user.id, examId, dto)
  }

  @Post(':examId/switch')
  recordSwitch(@CurrentUser() user: { id: string }, @Param('examId') examId: string) {
    return this.service.recordSwitch(user.id, examId)
  }

  @Post(':examId/submit')
  submit(@CurrentUser() user: { id: string }, @Param('examId') examId: string) {
    return this.service.submit(user.id, examId)
  }
}
