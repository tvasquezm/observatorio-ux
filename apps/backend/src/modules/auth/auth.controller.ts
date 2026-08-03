import { Controller, Get } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
  constructor(private readonly jwtService: JwtService) {}

  // Endpoint temporal solo para generar tokens de prueba en Postman
  @Get('test-token')
  getTestToken() {
    const payload = { 
  sub: 'c702fdcf-ff14-4e49-bcdf-620f1738bb04', 
  email: 'evaluador@observatorioux.com', 
  rol: 'DOCENTE' 
};
    
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}