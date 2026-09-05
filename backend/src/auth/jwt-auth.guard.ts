import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Protege un endpoint: exige `Authorization: Bearer <token>` válido.
 * Los controllers del panel (`/admin/*`, Fase 3) lo usan a nivel de clase. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
