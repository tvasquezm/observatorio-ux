import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { Roles } from '../../core/decorators/roles.decorator';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
@Controller('projects/:proyectoId/reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('json')
  async generateJson(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reports.buildReport(proyectoId, user);
  }

  @Get('pdf')
  async generatePdf(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const pdf = await this.reports.generatePdf(proyectoId, user);

    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reporte-proyecto-${proyectoId}.pdf"`,
      'Content-Length': pdf.length,
    });

    response.end(pdf);
  }
}
