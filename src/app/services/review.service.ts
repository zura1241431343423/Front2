import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

export interface User {
  id: number;
  name: string;
  lastName: string;
}

export interface UserReview {
  id?: number;
  userId: number;
  userName?: string;
  timestamp?: Date;
  rating: number;
  commentText: string;
  productId: string | number;
  addedAt?: Date;
  user?: User;
}


export interface PostReviewDto {
  userId: number;
  productId: number;
  content: string;
  rating?: number; 
}


export interface CommentResponse {
  id: number;
  userId: number;
  productId: number;
  content: string;
  addedAt: Date;
   userFullName: string;
  user?: {
    id: number;
    name: string;
    lastName: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private apiUrl = 'https://localhost:7233/api/comment';

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  
  getAllComments(): Observable<CommentResponse[]> {
    console.log('Making API call to:', this.apiUrl);
    return this.http.get<CommentResponse[]>(this.apiUrl).pipe(
      tap(response => console.log('API Response:', response)),
      catchError(error => {
        console.error('API Error:', error);
        throw error;
      })
    );
  }

  
  getCommentsByProductId(productId: number): Observable<CommentResponse[]> {
    return this.http.get<CommentResponse[]>(`${this.apiUrl}/product/${productId}`);
  }

  
  postComment(comment: PostReviewDto): Observable<CommentResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<CommentResponse>(this.apiUrl, comment, { headers });
  }

  
  updateComment(id: number, comment: PostReviewDto): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.apiUrl}/${id}`, comment, { headers });
  }

  
  deleteComment(id: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete(`${this.apiUrl}/${id}`, { headers });
  }
}