import { Routes } from '@angular/router';
import { LoginPage } from './login.page';
import { WorkspacePage } from './workspace.page';
import { authGuard, doctorGuard } from './auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginPage },
  { path: 'workspace/records', component: WorkspacePage, canActivate: [doctorGuard] },
  { path: 'workspace/:section', component: WorkspacePage, canActivate: [authGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
