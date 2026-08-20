import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BarbersService {
  constructor(private readonly prisma: PrismaService) {}

  findAllActive() {
    return this.prisma.barber.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        slug: true,
        photoUrl: true,
        bio: true,
        ratingAverage: true,
        ratingCount: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  findSchedule(barberId: string) {
    return this.prisma.barberSchedule.findMany({
      where: { barberId },
      orderBy: { weekday: 'asc' },
    });
  }
}
