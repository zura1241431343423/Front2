import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface User {
  id?: number;
  name: string;
  lastName: string;
  email: string;
  password?: string;
  address?: string;
  role?: string;
}

export interface UserDetailsResponse {
  id: number;
  name: string;
  lastName: string;
  email: string;
  address?: string;
  role?: string;
}

export interface UserInfo {
  name: string;
  lastName: string;
  userId: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl: string = 'https://localhost:7233/api/users';
  private authUrl: string = 'https://localhost:7233/api/auth';
  private currentUserSubject: BehaviorSubject<User | null> = new BehaviorSubject<User | null>(this.getUserFromStorage());

  constructor(private http: HttpClient) {}

  register(user: User): Observable<any> {
    return this.http.post(this.apiUrl, user).pipe(
      catchError(error => {
        console.error('Registration error:', error);
        throw error;
      })
    );
  }

  login(credentials: { email: string; password: string }): Observable<User> {
    return new Observable<User>(observer => {
      this.http.post<User>(`${this.authUrl}/login`, credentials).pipe(
        catchError(error => {
          observer.error(error);
          return of(null);
        })
      ).subscribe({
        next: (user: User | null) => {
          if (user) {
            localStorage.setItem('currentUser', JSON.stringify(user));
            localStorage.setItem('userId', user.id?.toString() || '');
            localStorage.setItem('name', user.name);
            localStorage.setItem('lastName', user.lastName);
            this.currentUserSubject.next(user);
            observer.next(user);
          }
          observer.complete();
        },
        error: (err) => {
          observer.error(err);
          observer.complete();
        }
      });
    });
  }

  getUserById(userId: number): Observable<UserDetailsResponse> {
    const headers: HttpHeaders = this.getAuthHeaders();
    return this.http.get<UserDetailsResponse>(`${this.apiUrl}/${userId}`, { headers }).pipe(
      catchError(error => {
        console.error('Error fetching user by ID:', error);
        throw error;
      })
    );
  }

  getCurrentUserDetails(): Observable<UserDetailsResponse | null> {
    const userId: string | null = localStorage.getItem('userId');
    if (!userId) {
      return of(null);
    }
    return this.getUserById(Number(userId)).pipe(
      catchError(() => of(null))
    );
  }

  updateUserInfo(name: string, lastName: string): void {
    localStorage.setItem('name', name);
    localStorage.setItem('lastName', lastName);
    const currentUser: User | null = this.currentUserSubject.value;
    if (currentUser) {
      const updatedUser: User = {
        ...currentUser,
        name,
        lastName
      };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      this.currentUserSubject.next(updatedUser);
    }
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('name');
    localStorage.removeItem('lastName');
    localStorage.removeItem('userId');
    localStorage.removeItem('rawRole');
    this.currentUserSubject.next(null);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('authToken');
  }

  getUserInfo(): UserInfo {
    const name: string = localStorage.getItem('name') || 'User';
    const lastName: string = localStorage.getItem('lastName') || '';
    const userIdStr: string | null = localStorage.getItem('userId');
    const userId: number | null = userIdStr ? Number(userIdStr) : null;

    const cleanName: string = name === 'undefined' ? 'User' : name;
    const cleanLastName: string = lastName === 'undefined' ? '' : lastName;

    return {
      name: cleanName,
      lastName: cleanLastName,
      userId
    };
  }

  getAllUsers(): Observable<UserDetailsResponse[]> {
    const headers: HttpHeaders = this.getAuthHeaders();
    return this.http.get<UserDetailsResponse[]>(this.apiUrl, { headers }).pipe(
      catchError(error => {
        console.error('Error fetching all users:', error);
        throw error;
      })
    );
  }

  private getUserFromStorage(): User | null {
    const stored: string | null = localStorage.getItem('currentUser');
    return stored ? JSON.parse(stored) : null;
  }

  private getAuthHeaders(): HttpHeaders {
    const token: string | null = localStorage.getItem('authToken');
    let headers: HttpHeaders = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }
}