import { forwardRef, Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { Project } from './entity/project.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectMember } from './entity/project-member.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TasksModule } from 'src/tasks/tasks.module';
import { User } from 'src/users/entity/user.entity';
import { Auth } from 'src/common/decorators/auth.decorator';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectMember, User]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'), 
        signOptions: { expiresIn: '3d' },
      }),
    }),
   forwardRef(() => TasksModule),
   forwardRef(() => AuthModule)
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService, TypeOrmModule],
})
export class ProjectsModule {}
