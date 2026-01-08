import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from '../common/decorators/user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Auth } from 'src/common/decorators/auth.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  @Auth()
  @Get('profile')
  getMe(@User() user) {
      return user;
    }
  @Auth()
  @Get('profile/me/:id')
  async getProfile(@User('id') userId: string) {
      return this.usersService.findMeById(userId);  
  }
  
  @Auth()
  @Patch('profile/me')
  async updateUserProfile(@User('id') userId: string, @Body() updateUserDto: UpdateUserDto,) {
    return this.usersService.updateProfile(userId, updateUserDto);
  }
  
  @Auth()
  @Patch(':id/password')
  async updatePassword(@Param('id') id: string, @Body() updatePasswordDto: UpdatePasswordDto,) {
      return  this.usersService.updatePassword(id, updatePasswordDto);
    }
  
  @Auth()
  @Delete(':id')
  deleteUser(@Param('id') id: string) {
      return this.usersService.delete(id);
    }

}

