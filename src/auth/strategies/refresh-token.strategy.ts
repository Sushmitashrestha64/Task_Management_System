import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOptionsWithRequest } from 'passport-jwt'; 
import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: (req: Request) => {
        return req?.cookies?.['refresh_token'];
      },

      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET') || 'your-fallback-secret',
      passReqToCallback: true,
    } as StrategyOptionsWithRequest); 
  }

  async validate(req: Request, payload: any) {
    const refreshToken = req.cookies?.['refresh_token'];
    if (!payload || !refreshToken) {
      throw new UnauthorizedException('Refresh token missing or invalid');
    }
    return { 
        userId: payload.userId, 
        email: payload.email, 
        refreshToken: refreshToken,
    };
  }
}