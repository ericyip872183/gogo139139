import { Module } from '@nestjs/common'
import { ExamRoomController } from './exam-room.controller'
import { ExamRoomService } from './exam-room.service'
import { ExamTimeoutTask } from './exam-timeout.task'

@Module({
  controllers: [ExamRoomController],
  providers: [ExamRoomService, ExamTimeoutTask],
  exports: [ExamRoomService],
})
export class ExamRoomModule {}
