import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SalasService } from './salas.service';
import { CreateSalaDto } from './dto/sala.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.interface';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('salas')
export class SalasController {
  constructor(private readonly salasService: SalasService) {}

  @Get()
  @Roles('DOCENTE', 'ADMIN', 'ESTUDIANTE')
  async findAll() {
    return this.salasService.findAll();
  }

  @Post()
  @Roles('DOCENTE', 'ADMIN')
  async create(@Body() createSalaDto: CreateSalaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.salasService.create(createSalaDto, user.id);
  }
}