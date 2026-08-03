/**
 * Ajusta estos campos a lo que realmente firmas en el payload del JWT
 * (por ejemplo en tu AuthService.login / JwtStrategy.validate).
 */
export interface AuthenticatedUser {
  id: string;
  email?: string;
  rol?: string;
}
