import { Module } from '@nestjs/common';
import { B2Service} from './b2.service';
import { B2Controller } from './b2.controller';

@Module({
  controllers: [B2Controller],
  providers: [B2Service],
})
export class B2Module {}
