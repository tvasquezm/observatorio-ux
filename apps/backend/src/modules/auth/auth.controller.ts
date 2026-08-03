import { Controller, Get } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
  constructor(private readonly jwtService: JwtService) {}

  // Endpoint temporal solo para generar tokens de prueba en Postman
  @Get('test-token')
  getTestToken() {
    const payload = { 
      // ¡Ahora usamos tu ID real de la base de datos!
      sub: '62848df5-2560-4a28-a303-43b0af2b65a2', 
      email: 'tester@observatorioux.com', 
      rol: 'PARTICIPANTE' 
    };
    
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}