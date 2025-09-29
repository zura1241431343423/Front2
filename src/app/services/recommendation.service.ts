import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, combineLatest, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Product } from '../services/product.service';
import { ClickTrackingService } from '../services/click-tracking.service';
import { UserService } from '../services/user.service';

interface RecommendationCategory {
  subCategory: string;
  products: Product[];
  clickCount: number;
  confidence: number;
}

@Injectable({
  providedIn: 'root'
})
export class RecommendationService {
  private apiUrl = 'https://localhost:7233/api';
  private recommendations = new BehaviorSubject<RecommendationCategory[]>([]);
  private isLoading = new BehaviorSubject<boolean>(false);
  private hasClickedProduct = new BehaviorSubject<boolean>(
    localStorage.getItem('hasClickedProduct') === 'true'
  );

  recommendations$ = this.recommendations.asObservable();
  isLoading$ = this.isLoading.asObservable();

  constructor(
    private http: HttpClient,
    private clickTrackingService: ClickTrackingService,
    private userService: UserService
  ) {
    this.clickTrackingService.clickUpdated$.subscribe(() => this.refreshRecommendations());
  }

  getPersonalizedRecommendations(maxProducts = 20): Observable<Product[]> {
    const userId = this.userService.getCurrentUser()?.id;
    const hasClicked = this.hasClickedProduct.value;

    // Case 1: No user or has not clicked => show random
    if (!userId || !hasClicked) {
      return this.getRandomProducts(maxProducts);
    }

    this.isLoading.next(true);

    
    return this.hasUserClicks(userId).pipe(
      switchMap(hasClicks => {
        if (!hasClicks) {
          return of([]); 
        } else {
          return this.getPersonalizedRecommendationsFromClicks(userId, maxProducts);
        }
      }),
      catchError(() => {
        this.isLoading.next(false);
        return of([]);
      })
    );
  }

  private hasUserClicks(userId: number): Observable<boolean> {
    return this.http.get<any[]>(`${this.apiUrl}/Click/user-stats/${userId}`).pipe(
      map(stats => stats && stats.length > 0),
      catchError(() => of(false))
    );
  }

  private getPersonalizedRecommendationsFromClicks(userId: number, maxProducts: number): Observable<Product[]> {
    return this.http.get<any[]>(`${this.apiUrl}/Click/recommendations/${userId}`, {
      params: { limit: maxProducts.toString() }
    }).pipe(
      map(recommendations => {
        this.isLoading.next(false);
        if (recommendations && recommendations.length > 0) {
          return this.shuffleArray(recommendations.map(rec => rec.product));
        } else {
          return [];
        }
      }),
      catchError(() => {
        this.isLoading.next(false);
        return of([]);
      })
    );
  }

  getUserClickStats(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/Click/user-stats/${userId}`).pipe(
      catchError(() => of([]))
    );
  }

  getUserRecommendations(userId: number, limit = 50): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/Click/recommendations/${userId}`, {
      params: { limit: limit.toString() }
    }).pipe(
      catchError(() => of([]))
    );
  }

  getRecommendationsByCategory(): Observable<RecommendationCategory[]> {
    const userId = this.userService.getCurrentUser()?.id;
    const hasClicked = this.hasClickedProduct.value;

    if (!userId || !hasClicked) return of([]);

    this.isLoading.next(true);

    return this.hasUserClicks(userId).pipe(
      switchMap(hasClicks => {
        if (!hasClicks) {
          this.isLoading.next(false);
          return of([]);
        } else {
          return this.getCategorizedRecommendations(userId);
        }
      }),
      catchError(() => {
        this.isLoading.next(false);
        return of([]);
      })
    );
  }

  private getCategorizedRecommendations(userId: number): Observable<RecommendationCategory[]> {
    return combineLatest([
      this.getUserClickStats(userId),
      this.getUserRecommendations(userId, 50)
    ]).pipe(
      map(([clickStats, recommendations]) => {
        const categoryMap = new Map<string, RecommendationCategory>();

        recommendations.forEach((rec: any) => {
          const product = rec.product;
          const subCategory = product.subCategory;

          if (!categoryMap.has(subCategory)) {
            const clickData = clickStats.find(stat => stat.subCategory === subCategory);
            categoryMap.set(subCategory, {
              subCategory,
              products: [],
              clickCount: clickData?.clickCount || 0,
              confidence: this.calculateConfidence(clickData?.clickCount || 0)
            });
          }
          categoryMap.get(subCategory)!.products.push(product);
        });

        const result = Array.from(categoryMap.values())
          .sort((a, b) => b.clickCount - a.clickCount || b.confidence - a.confidence)
          .slice(0, 5);

        this.recommendations.next(result);
        this.isLoading.next(false);
        return result;
      }),
      catchError(() => {
        this.isLoading.next(false);
        return of([]);
      })
    );
  }

  refreshRecommendations(): void {
    this.getRecommendationsByCategory().subscribe();
  }

  trackProductClick(productId: number, subCategory?: string): void {
    const userId = this.userService.getCurrentUser()?.id;
    if (!userId) return;

    this.http.post(`${this.apiUrl}/Click`, { productId, userId, subCategory }).subscribe({
      next: () => {
    
        localStorage.setItem('hasClickedProduct', 'true');
        this.hasClickedProduct.next(true);

        this.clickTrackingService.notifyClickTracked();
        this.refreshRecommendations();
      },
      error: () => console.error('Error tracking click')
    });
  }

  private getProductsBySubcategories(subcategories: string[], maxProducts: number): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/Click/products/by-subcategories`, {
      params: {
        subcategories: subcategories.join(','),
        limit: maxProducts.toString()
      }
    }).pipe(
      map(products => this.shuffleArray(products)),
      catchError(() => of([]))
    );
  }

  private getRandomProducts(maxProducts: number): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/Click/products/random`, {
      params: { limit: maxProducts.toString() }
    }).pipe(
      map(products => this.shuffleArray(products)),
      catchError(() => of([]))
    );
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private calculateConfidence(clickCount: number): number {
    if (clickCount === 0) return 0;
    if (clickCount >= 10) return 1;
    return clickCount / 10;
  }

  
  resetClickState(): void {
    localStorage.removeItem('hasClickedProduct');
    this.hasClickedProduct.next(false);
  }
}
