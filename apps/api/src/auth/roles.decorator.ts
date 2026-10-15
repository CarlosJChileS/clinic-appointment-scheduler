import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export type StaffRole = 'doctor' | 'secretary';
export const Roles = (...roles: StaffRole[]) => SetMetadata(ROLES_KEY, roles);
