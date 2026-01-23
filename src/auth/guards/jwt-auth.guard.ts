import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly authService: AuthService) {
    super();
  }
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest();
      const response = context.switchToHttp().getResponse();
      try{
        const isValid = (await super.canActivate(context)) as boolean;
        if (!isValid) {
          throw new UnauthorizedException('Invalid or expired token');
        }
        return isValid;
      }
      catch(err){
        const refreshToken = request.cookies['refresh_token'];
        if(!refreshToken){
          throw new UnauthorizedException('Session expired. Please log in again.');
        }
        try{
          const tokens = await this.authService.refreshTokens(refreshToken);
          response.cookie('access_token', tokens.access_token, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000,
          });
          response.cookie('refresh_token', tokens.refresh_token, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, 
        });

        const user = await this.authService.verifyToken(tokens.access_token);
        request.user = user;
        return true;
        }catch(refreshErr){
          throw new UnauthorizedException('Invalid session. Please log in again.');
          }
      }
  }
  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}