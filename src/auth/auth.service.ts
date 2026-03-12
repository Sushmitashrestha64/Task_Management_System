import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const isValidUser = await this.usersService.validatePassword(email, password);
    if (!isValidUser) {
      throw new UnauthorizedException('Invalid input credentials');
    }

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid input credentials');
    }

    const tokens = await this.generateTokens(user.userId, user.email);
    //  Hash the refresh token and save it to the database
    const salt = await bcrypt.genSalt();
    const hashedRefreshToken = await bcrypt.hash(tokens.refresh_token, salt);
    await this.usersService.updateRefreshToken(user.userId, hashedRefreshToken);
    return tokens;
  }

  async generateTokens(userId: string, email: string) {
    const jwtPayload = { userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '15m', 
      }),
      this.jwtService.signAsync(jwtPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'), 
        expiresIn: '7d',
      }),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async refreshTokens(refreshToken: string) {
    let payload;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
    } catch (e) {
      throw new ForbiddenException('Invalid refresh token');
    }

    const user = await this.usersService.findUserWithToken(payload.userId);
    if (!user || !user.refreshToken) {
        throw new ForbiddenException('Access Denied');
    }

    const matches = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!matches) {
        throw new ForbiddenException('Token mismatch');
    }

    const tokens = await this.generateTokens(user.userId, user.email);
    const salt = await bcrypt.genSalt();
    const hashedToken = await bcrypt.hash(tokens.refresh_token, salt);
    await this.usersService.updateRefreshToken(user.userId, hashedToken);

    return tokens;
 }

 async verifyToken(token: string) {
  try {
    const payload = await this.jwtService.verifyAsync(token, {
      secret: this.configService.get<string>('JWT_SECRET'),
    });
    
    return await this.usersService.findMeById(payload.userId);
  } catch (error) {
    return null;
  }
}
  
}