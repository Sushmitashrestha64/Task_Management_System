import { Test, TestingModule } from '@nestjs/testing';
import { B2Controller } from './b2.controller';
import { B2Service } from './b2.service';

describe('B2Controller', () => {
  let controller: B2Controller;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [B2Controller],
      providers: [B2Service],
    }).compile();

    controller = module.get<B2Controller>(B2Controller);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
