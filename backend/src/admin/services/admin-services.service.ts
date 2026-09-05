import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { isUniqueConstraintError } from '../../common/prisma-errors.util';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class AdminServicesService {
  constructor(private readonly prisma: PrismaService) {}

  /** A diferencia de `ServicesService` (público, solo activos), acá se listan
   * también los inactivos para poder reactivarlos desde el panel. */
  findAll() {
    return this.prisma.service.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async findOneOrThrow(id: string) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) {
      throw new NotFoundException('Servicio no encontrado.');
    }
    return service;
  }

  create(dto: CreateServiceDto) {
    return this.withUniqueConflictHandling(() =>
      this.prisma.service.create({ data: dto }),
    );
  }

  async update(id: string, dto: UpdateServiceDto) {
    await this.findOneOrThrow(id);
    return this.withUniqueConflictHandling(() =>
      this.prisma.service.update({ where: { id }, data: dto }),
    );
  }

  /** Igual que con los barberos: no se borra (las reservas pasadas referencian el
   * servicio), se marca inactivo y deja de salir en el sitio público. */
  async deactivate(id: string) {
    await this.findOneOrThrow(id);
    return this.prisma.service.update({
      where: { id },
      data: { active: false },
    });
  }

  private async withUniqueConflictHandling<T>(
    fn: () => Promise<T>,
  ): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException('Ya existe un servicio con ese slug.');
      }
      throw err;
    }
  }
}
