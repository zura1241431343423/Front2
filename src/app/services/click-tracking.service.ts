import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { UserService } from '../services/user.service';

export interface ClickDto {
  productId: number;
  userId?: number;
  subCategory?: string;
}

export interface ClickResponse {
  message: string;
}

export interface RecommendationData {
  subCategory: string;
  clickCount: number;
  lastClickedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ClickTrackingService {
  private apiUrl = 'https://localhost:7233/api/Click'; 
  private clickUpdates = new BehaviorSubject<void>(undefined);

  public clickUpdated$ = this.clickUpdates.asObservable();

  constructor(
    private http: HttpClient,
    private userService: UserService
  ) {}

  trackClick(productId: number, subCategory?: string): Observable<ClickResponse> {
    const userInfo = this.userService.getUserInfo();
    
    if (!userInfo.userId) {
      console.warn('User must be logged in to track clicks');
      return of({ message: 'User not logged in' });
    }

    const clickData: ClickDto = {
      productId,
      userId: userInfo.userId,
      subCategory
    };

    const headers = this.getAuthHeaders();
    return this.http.post<ClickResponse>(this.apiUrl, clickData, { headers }).pipe(
      tap(() => this.notifyClickTracked()),
      catchError(error => {
        console.error('Error tracking click:', error);
        return of({ message: 'Error tracking click' });
      })
    );
  }


  trackClickWithUserId(clickData: ClickDto): Observable<ClickResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<ClickResponse>(this.apiUrl, clickData, { headers }).pipe(
      tap(() => this.notifyClickTracked()),
      catchError(error => {
        console.error('Error tracking click with user ID:', error);
        return of({ message: 'Error tracking click' });
      })
    );
  }

  getUserClickStats(userId?: number): Observable<RecommendationData[]> {
    const targetUserId = userId || this.userService.getUserInfo().userId;
    
    if (!targetUserId) {
      console.warn('User ID is required for click stats');
      return of([]);
    }

    const headers = this.getAuthHeaders();
 
    return this.http.get<RecommendationData[]>(`${this.apiUrl}/user-stats/${targetUserId}`, { headers }).pipe(
      catchError(error => {
        console.error('Error fetching user click stats:', error);
        return of([]);
      })
    );
  }


  getCurrentUserClickStats(): Observable<RecommendationData[]> {
    return this.getUserClickStats();
  }

  getUserRecommendations(userId?: number, limit: number = 10): Observable<any[]> {
    const targetUserId = userId || this.userService.getUserInfo().userId;
    
    if (!targetUserId) {
      console.warn('User ID is required for recommendations');
      return of([]);
    }

    const headers = this.getAuthHeaders();
  
    return this.http.get<any[]>(`${this.apiUrl}/recommendations/${targetUserId}?limit=${limit}`, { headers }).pipe(
      catchError(error => {
        console.error('Error fetching user recommendations:', error);
        return of([]);
      })
    );
  }


  getCurrentUserRecommendations(limit: number = 10): Observable<any[]> {
    return this.getUserRecommendations(undefined, limit);
  }

  getTopClickedProducts(limit: number = 10): Observable<any[]> {
    const headers = this.getAuthHeaders();
  
    return this.http.get<any[]>(`${this.apiUrl}/top-products?limit=${limit}`, { headers }).pipe(
      catchError(error => {
        console.error('Error fetching top clicked products:', error);
        return of([]);
      })
    );
  }

  notifyClickTracked(): void {
    this.clickUpdates.next();
  }

 
  canTrackClicks(): boolean {
    return this.userService.isLoggedIn() && !!this.userService.getUserInfo().userId;
  }


  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  }

 
  getUserPreferences(userId?: number, limit: number = 5): Observable<RecommendationData[]> {
    return this.getUserClickStats(userId).pipe(
      catchError(error => {
        console.error('Error fetching user preferences:', error);
        return of([]);
      })
    );
  }


  hasClickHistory(userId?: number): Observable<boolean> {
    return this.getUserClickStats(userId).pipe(
      catchError(() => of([])),
      map(stats => stats.length > 0)
    );
  }


  clearClickUpdates(): void {
    this.clickUpdates.complete();
    this.clickUpdates = new BehaviorSubject<void>(undefined);
  }
}