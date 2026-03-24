import { Module } from '@nestjs/common'
import { AiController } from './ai.controller'
import { AiService } from './ai.service'
import { AiAdminController } from './ai-admin.controller'
import { AiAdminService } from './ai-admin.service'
import { AiTenantController } from './ai-tenant.controller'

@Module({
  controllers: [AiController, AiAdminController, AiTenantController],
  providers: [AiService, AiAdminService],
  exports: [AiService, AiAdminService],
})
export class AiModule {}
