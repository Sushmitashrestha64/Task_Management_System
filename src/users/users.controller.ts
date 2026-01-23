import { Body, Controller, Delete, Get, Param, Patch, Post, Res,  } from '@nestjs/common';
import { ApiTags, ApiBody, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from '../common/decorators/user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password';
import { Auth } from 'src/common/decorators/auth.decorator';
import { VerifyOtpDto } from 'src/otp/dto/verify-otp.dto';
import type { Response } from 'express';
import { AuthService } from 'src/auth/auth.service';
import * as bcrypt from 'bcrypt';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService,
    private readonly authService: AuthService
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user and send OTP' })
  @ApiBody({ type: CreateUserDto })
  async register(@Body() createUserDto: CreateUserDto) {
    await this.usersService.createUser(createUserDto);

    return { 
      message: 'Registration successful. Please check your email for the OTP code.' 
    };
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify OTP and Auto-Login' })
  @ApiBody({ type: VerifyOtpDto })
  async verifyEmail(
    @Body() verifyOtpDto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { savedUser } = await this.usersService.verifyUserEmail(
      verifyOtpDto.email,
      verifyOtpDto.otp,
    );

    const tokens = await this.authService.generateTokens(
      savedUser.userId,
      savedUser.email,
    );

    const salt = await bcrypt.genSalt();
    const hashedRefreshToken = await bcrypt.hash(
      tokens.refresh_token,
      salt,
    );

    await this.usersService.updateRefreshToken(
      savedUser.userId,
      hashedRefreshToken,
    );
    
    this.setCookies(res, tokens);
    return {
      message: 'Email verified and logged in successfully',
      user: {
        userId: savedUser.userId,
        name: savedUser.name,
        email: savedUser.email,
      },
    };
  }

  private setCookies(res: Response, tokens: any) {
    res.cookie('access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, 
    });

    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
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

