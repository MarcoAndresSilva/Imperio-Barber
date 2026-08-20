import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  findAllActive() {
    return this.prisma.service.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
