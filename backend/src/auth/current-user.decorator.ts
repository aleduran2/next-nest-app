import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '../common/enums/role.enum';

export interface CurrentUserPayload {
  userId: number;
  email: string;
  role: Role;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
