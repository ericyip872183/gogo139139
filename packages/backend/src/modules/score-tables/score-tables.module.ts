import { Module } from '@nestjs/common'
import { ScoreTablesController } from './score-tables.controller'
import { ScoreTablesService } from './score-tables.service'

@Module({
  controllers: [ScoreTablesController],
  providers: [ScoreTablesService],
})
export class ScoreTablesModule {}
