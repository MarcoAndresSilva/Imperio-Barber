import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !(await this.verify(user.passwordHash, dto.password))) {
      // Mismo mensaje exista o no el usuario: no revela qué correos están registrados.
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { accessToken };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !(await this.verify(user.passwordHash, dto.currentPassword))) {
      throw new UnauthorizedException('La contraseña actual no es correcta.');
    }

    const passwordHash = await argon2.hash(dto.newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    return { ok: true };
  }

  private async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      // Hash corrupto en la BD: se trata como credencial inválida, no como 500.
      return false;
    }
  }
}
