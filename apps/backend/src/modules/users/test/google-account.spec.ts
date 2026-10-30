import { validate } from 'class-validator';
import { CreateDocenteDto } from '../dto/user.dto.js';
import { UsersService } from '../users.service.js';

describe('Autorizar cuentas Google', () => {
  it('permite Google sin contraseña y exige contraseña para el acceso local', async () => {
    const dto = Object.assign(new CreateDocenteDto(), { nombre: 'Ana', email: 'ana@utem.cl', acceso: 'GOOGLE' });
    expect(await validate(dto)).toHaveLength(0);
    dto.acceso = 'PASSWORD';
    expect((await validate(dto)).some(error => error.property === 'password')).toBe(true);
  });

  it('crea una cuenta docente sin contraseña ni privilegios de administrador', async () => {
    const prisma = { usuario: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockImplementation(async ({ data }) => ({ id: 'u1', ...data })) } };
    const service = new UsersService(prisma as never, {} as never);
    const account = await service.createDocente({ nombre: ' Ana ', email: 'ANA@UTEM.CL', acceso: 'GOOGLE' });
    expect(prisma.usuario.create).toHaveBeenCalledWith({ data: { nombre: 'Ana', email: 'ana@utem.cl', passwordHash: null, rol: 'DOCENTE' } });
    expect(account).not.toHaveProperty('passwordHash');
  });
});
