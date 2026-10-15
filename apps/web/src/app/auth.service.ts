import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  token() { return localStorage.getItem('clinic_token'); }
  role() { return localStorage.getItem('clinic_role') ?? 'unknown'; }
  displayName() { return localStorage.getItem('clinic_name') ?? 'Equipo clínico'; }
  isDoctor() { return this.role() === 'doctor'; }
  login(username: string, password: string): Observable<{ access_token: string; user: { name: string; role: 'doctor' | 'secretary' } }> {
    return this.http.post<{ access_token: string; user: { name: string; role: 'doctor' | 'secretary' } }>(`${API}/auth/login`, { username, password }).pipe(tap((result) => {
      localStorage.setItem('clinic_token', result.access_token);
      localStorage.setItem('clinic_role', result.user.role);
      localStorage.setItem('clinic_name', result.user.name);
    }));
  }
  logout() { localStorage.removeItem('clinic_token'); localStorage.removeItem('clinic_role'); localStorage.removeItem('clinic_name'); this.router.navigateByUrl('/login'); }
}

export { API };
