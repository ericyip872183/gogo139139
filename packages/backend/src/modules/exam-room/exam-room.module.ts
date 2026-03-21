import { Module } from '@nestjs/common'
import { ExamRoomController } from './exam-room.controller'
import { ExamRoomService } from './exam-room.service'

@Module({
  controllers: [ExamRoomController],
  providers: [ExamRoomService],
})
export class ExamRoomModule {}
