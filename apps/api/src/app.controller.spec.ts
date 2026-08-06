import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { ApplicationStatus } from '@ekspres/contracts';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('getStatus', () => {
    it('should return service ok status', () => {
      const response = appController.getStatus();
      expect(response.service).toBe('api');
      expect(response.status).toBe(ApplicationStatus.OK);
      expect(response.timestamp).toBeDefined();
    });
  });
});
