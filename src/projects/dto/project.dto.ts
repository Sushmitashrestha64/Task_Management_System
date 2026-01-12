import { IsString, IsEnum, IsOptional, IsUUID, IsEmail } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { ProjectRole } from '../entity/project-member.entity';
import { Visibility } from '../entity/project.entity';

export class CreateProjectDto {
    @ApiProperty({ description: 'Name of the project' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Description of the project', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'Visibility of the project', enum: Visibility, default: Visibility.PUBLIC })
    @IsEnum(Visibility)
    visibility: Visibility;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}

export class AddProjectMemberDto {
    @ApiProperty()
    @IsUUID()
    userId: string;

    @ApiProperty({ enum: ProjectRole })
    @IsEnum(ProjectRole)
    role: ProjectRole;
}

export class InviteMemberDto {
    @ApiProperty({ description: 'Email of the user to invite' })
    @IsEmail()
    email: string;

    @ApiProperty({ enum: ProjectRole })
    @IsEnum(ProjectRole)
    role: ProjectRole;
}   

export class AcceptInvitationDto {
    @ApiProperty()
    @IsString()
    token: string;
}

export class ChangeMemberRoleDto {
    @ApiProperty({ enum: ProjectRole })
    @IsEnum(ProjectRole)
    role: ProjectRole;
}