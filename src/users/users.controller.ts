import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from '../common/decoractor/user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  @Get('profile')
  getMe(@User() user) {
      return user;
    }

  @Get('me/:id')
  async getProfile(@User('id') userId: string, @Param('id') paramId: string) {
    if (userId !== paramId) {
      throw new BadRequestException('Access denied');
    }
    return this.usersService.findMeById(userId);
  }

  @Patch('me')
  async updateUserProfile(@User('id') userId: string, @Body() updateUserDto: UpdateUserDto,) {
    return this.usersService.updateProfile(userId, updateUserDto);
  }
  
  @Patch(':id/password')
  async updatePassword(@Param('id') id: string, @Body() updatePasswordDto: UpdatePasswordDto,) {
      return  this.usersService.updatePassword(id, updatePasswordDto);
    }

  @Delete(':id')
  deleteUser(@Param('id') id: string) {
      return this.usersService.delete(id);
    }

}

