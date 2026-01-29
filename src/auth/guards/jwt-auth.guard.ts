import { ExecutionContext, Inject, Injectable, UnauthorizedException,forwardRef } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../auth.service';


@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService) {
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
        console.log('Access Token expired. Attempting silent refresh...');
        const refreshToken = request.cookies['refresh_token'];
        if(!refreshToken){
          console.log(' No refresh token found in cookies.');
          throw new UnauthorizedException('Session expired. Please log in again.');
        }
        try{
          const tokens = await this.authService.refreshTokens(refreshToken);
           console.log('Tokens refreshed successfully. Setting new cookies...');
          response.cookie('access_token', tokens.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000,
          });
          response.cookie('refresh_token', tokens.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, 
        });

        const user = await this.authService.verifyToken(tokens.access_token);
        if (!user) {
          console.log('Silent refresh failed: New token could not be verified.');
          throw new UnauthorizedException('Re-authentication failed. Please log in again.');
        }
        request.user = user;
        console.log(`User ${user.email} re-authenticated silently.`);
        return true;

        }catch(refreshErr){
          console.log(`--- Silent refresh FAILED in AuthService: ${refreshErr.message} ---`);
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