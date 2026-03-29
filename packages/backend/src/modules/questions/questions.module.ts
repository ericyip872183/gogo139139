import { Module } from '@nestjs/common'
import { QuestionsController } from './questions.controller'
import { QuestionsService } from './questions.service'
import { AiImportService } from './services/ai-import.service'

@Module({
  controllers: [QuestionsController],
  providers: [QuestionsService, AiImportService],
  exports: [QuestionsService, AiImportService],
})
export class QuestionsModule {}
