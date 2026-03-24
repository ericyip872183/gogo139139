import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { UsersModule } from './modules/users/users.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { PapersModule } from './modules/papers/papers.module';
import { ExamsModule } from './modules/exams/exams.module';
import { ExamRoomModule } from './modules/exam-room/exam-room.module';
import { ScoresModule } from './modules/scores/scores.module';
import { ScoreTablesModule } from './modules/score-tables/score-tables.module';
import { AdminModule } from './modules/admin/admin.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    OrganizationsModule,
    UsersModule,
    QuestionsModule,
    PapersModule,
    ExamsModule,
    ExamRoomModule,
    ScoresModule,
    ScoreTablesModule,
    AdminModule,
    AiModule,
  ],
})
export class AppModule {}
