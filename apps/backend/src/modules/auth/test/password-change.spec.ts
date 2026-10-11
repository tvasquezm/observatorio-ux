import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { AuthService } from '../auth.service.js';
import { ChangePasswordDto } from '../auth.dto.js';
import { validate } from 'class-validator';

describe('cambio de contraseña', () => {
  const usuario = { findUnique: jest.fn(), updateMany: jest.fn() };
  let service: AuthService;
  let passwordHash: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    passwordHash = await bcrypt.hash('actual-1234', 10);
    usuario.findUnique.mockResolvedValue({ passwordHash });
    usuario.updateMany.mockResolvedValue({ count: 1 });
    service = new AuthService({ usuario } as any, {} as any, {} as any, {} as any);
  });

  it('exige la contraseña actual sin modificar la cuenta si falla', async () => {
    await expect(service.changePassword('u1', 'incorrecta', 'nueva-1234')).rejects.toBeInstanceOf(ForbiddenException);
    expect(usuario.updateMany).not.toHaveBeenCalled();
  });

  it('guarda un hash de la nueva contraseña para la cuenta autenticada', async () => {
    await expect(service.changePassword('u1', 'actual-1234', 'nueva-1234')).resolves.toEqual({ ok: true });
    const { where, data } = usuario.updateMany.mock.calls[0][0];
    expect(where).toEqual({ id: 'u1', passwordHash });
    expect(data.passwordHash).not.toBe('nueva-1234');
    expect(await bcrypt.compare('nueva-1234', data.passwordHash)).toBe(true);
    expect(await bcrypt.compare('actual-1234', data.passwordHash)).toBe(false);
  });

  it('no sobrescribe una contraseña cambiada por otra solicitud', async () => {
    usuario.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.changePassword('u1', 'actual-1234', 'nueva-1234')).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza contraseñas que bcrypt truncaría, incluso con caracteres multibyte', async () => {
    await expect(service.changePassword('u1', 'actual-1234', 'á'.repeat(37))).rejects.toBeInstanceOf(BadRequestException);
    expect(usuario.updateMany).not.toHaveBeenCalled();
  });

  it('una cuenta sin contraseña no puede cambiarla por este flujo', async () => {
    usuario.findUnique.mockResolvedValue({ passwordHash: null });
    await expect(service.changePassword('u1', 'actual-1234', 'nueva-1234')).rejects.toBeInstanceOf(ForbiddenException);
    expect(usuario.updateMany).not.toHaveBeenCalled();
  });

  it('valida contraseña actual, longitud mínima y máxima al ingresar a la API', async () => {
    for (const values of [
      { newPassword: 'nueva-1234' },
      { currentPassword: 'actual-1234', newPassword: 'corta' },
      { currentPassword: 'actual-1234', newPassword: 'x'.repeat(73) },
    ]) {
      expect(await validate(Object.assign(new ChangePasswordDto(), values))).not.toHaveLength(0);
    }
    expect(await validate(Object.assign(new ChangePasswordDto(), { currentPassword: 'actual-1234', newPassword: 'nueva-1234' }))).toHaveLength(0);
  });
});
