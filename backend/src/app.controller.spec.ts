import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  let queryRaw: jest.Mock;

  beforeEach(async () => {
    queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: PrismaService, useValue: { $queryRaw: queryRaw } },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('returns ok when the database responds', async () => {
      await expect(appController.getHealth()).resolves.toEqual({
        status: 'ok',
        db: 'up',
      });
    });

    it('throws 503 when the database is unreachable', async () => {
      queryRaw.mockRejectedValueOnce(new Error('connection refused'));
      await expect(appController.getHealth()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });
});
