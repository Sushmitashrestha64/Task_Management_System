import { Test, TestingModule } from '@nestjs/testing';
import { B2Service } from './b2.service';

describe('B2Service', () => {
  let service: B2Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [B2Service],
    }).compile();

    service = module.get<B2Service>(B2Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
