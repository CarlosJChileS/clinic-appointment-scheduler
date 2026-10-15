import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StaffRole, ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<StaffRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!roles?.length) return true;
    const { user } = context.switchToHttp().getRequest<{ user?: { role?: StaffRole } }>();
    if (!user?.role || !roles.includes(user.role)) throw new ForbiddenException('Tu perfil no tiene acceso a esta sección.');
    return true;
  }
}
