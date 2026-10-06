import { Global, Module } from '@nestjs/common';
import { ProjectAccessService } from './project-access.service.js';

@Global()
@Module({
  providers: [ProjectAccessService],
  exports: [ProjectAccessService],
})
export class ProjectAccessModule {}
