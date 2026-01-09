import { Body, Controller, Delete, Get, Param, Patch, Post,  } from '@nestjs/common';
import { ApiTags, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from '../common/decorators/user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password';
import { Auth } from 'src/common/decorators/auth.decorator';
import { VerifyOtpDto } from 'src/otp/dto/verify-otp.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @ApiBody({ type: CreateUserDto })
  async register(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  @Post('verify-email')
  @ApiBody({ type: VerifyOtpDto })
  async verifyEmail(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.usersService.verifyUserEmail(verifyOtpDto.email, verifyOtpDto.otp);
  }

  @Auth()
  @ApiBearerAuth()
  @Get('profile')
  getMe(@User() user) {
      return user;
    }

  @Auth()
  @ApiBearerAuth()
  @Get('profile/me/:userId')
  async getProfile(@User('userId') userId: string) {
      return this.usersService.findMeById(userId);  
  }
  
  @Auth()
  @ApiBearerAuth()
  @Patch('profile/me')
  @ApiBody({ type: UpdateUserDto })
  async updateUserProfile(@User('userId') userId: string, @Body() updateUserDto: UpdateUserDto,) {
    return this.usersService.updateProfile(userId, updateUserDto);
  }
  
  @Auth()
  @ApiBearerAuth()
  @Patch(':userId/password')
  @ApiBody({ type: UpdatePasswordDto })
  async updatePassword(@Param('userId') userId: string, @Body() updatePasswordDto: UpdatePasswordDto,) {
      return  this.usersService.updatePassword(userId, updatePasswordDto);
    }
  
  @Auth()
  @ApiBearerAuth()
  @Delete(':userId')
  deleteUser(@Param('userId') userId: string) {
      return this.usersService.delete(userId);
    }

}

