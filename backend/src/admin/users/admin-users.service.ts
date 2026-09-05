import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { isUniqueConstraintError } from '../../common/prisma-errors.util';
import { CreateUserDto } from './dto/create-user.dto';

const USER_SUMMARY_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
} as const;

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: USER_SUMMARY_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: CreateUserDto) {
    const passwordHash = await argon2.hash(dto.password);

    try {
      return await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          name: dto.name,
          passwordHash,
          role: 'ADMIN',
        },
        select: USER_SUMMARY_SELECT,
      });
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException('Ya existe un usuario con ese email.');
      }
      throw err;
    }
  }

  /** Dos resguardos: no te puedes eliminar a ti mismo (evita quedarte fuera a
   * mitad de sesión) y siempre debe quedar al menos un usuario. */
  async remove(requesterId: string, userId: string): Promise<void> {
    if (requesterId === userId) {
      throw new BadRequestException('No puedes eliminar tu propia cuenta.');
    }

    const total = await this.prisma.user.count();
    if (total <= 1) {
      throw new BadRequestException(
        'Debe quedar al menos un usuario del panel.',
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    await this.prisma.user.delete({ where: { id: userId } });
  }
}
