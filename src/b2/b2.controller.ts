import { Controller } from '@nestjs/common';
import { B2Service } from './b2.service';

@Controller('b2')
export class B2Controller {
  constructor(private readonly b2Service: B2Service) {}
}
