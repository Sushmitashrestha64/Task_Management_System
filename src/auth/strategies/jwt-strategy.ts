import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from 'src/users/entity/user.entity';
import { UserStatus } from 'src/users/entity/user.entity';
import { UsersService } from 'src/users/users.service';


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || '@mySecretKey@',
    });
  }

  async validate(payload: any) {
    try {
      const user: User | null = await this.usersService.findMeById(payload.sub);
      
      if (!user || user.status !== UserStatus.ACTIVE) {
        console.log('JWT Strategy - User validation failed:', { 
          userExists: !!user, 
          status: user?.status 
        });
        throw new UnauthorizedException('Invalid token');
      }
      
      return user;
    } catch (error) {
      console.log('JWT validation error:', error.message);
      throw new UnauthorizedException('Invalid or expired token - please log in again');
    }
  }
}