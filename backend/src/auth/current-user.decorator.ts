import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Forma del usuario que `JwtStrategy.validate` deja en `request.user`. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

/** Inyecta el usuario autenticado en un handler protegido por `JwtAuthGuard`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return request.user;
  },
);
