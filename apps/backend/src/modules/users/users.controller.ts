import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateDocenteDto, UpdateUserRoleDto } from './dto/user.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.interface';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('ADMIN')
  async createDocente(@Body() dto: CreateDocenteDto) {
    return this.usersService.createDocente(dto);
  }

  @Get()
  @Roles('ADMIN')
  async listDocentes() {
    return this.usersService.listDocentes();
  }

  @Get('accounts')
  @Roles('ADMIN')
  async listAccounts() {
    return this.usersService.listAccounts();
  }

  @Patch(':id/role')
  @Roles('ADMIN')
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.updateRole(id, dto, user);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async removeDocente(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.removeDocente(id);
  }

  @Get('estudiantes')
  @Roles('ADMIN')
  async listEstudiantes(@Query('salaId') salaId?: string) {
    return this.usersService.listEstudiantes(salaId);
  }
}
