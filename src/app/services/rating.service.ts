import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';



interface RatingResponse {
  id: number;
  productId: number;
  userId: number;
  value: number;
  ratedAt: string;
}

interface RatingDto {
  productId: number;
  rating: number;
}

interface ProductRating {
  id: number;
  productId: number;
  userId: number;
  value: number;
  ratedAt: string;
  user?: {
    id: number;
    name: string;
    lastName: string;
  };
}

interface ProductRatingUpdate {
  productId: number;
  userRating: number;
  averageRating: number;
  ratingCount: number;
}

interface UserRatingInfo {
  userId: number;
  productId: number;
  rating: number;
  ratedAt: Date;
}

interface RatingStats {
  productId: number;
  totalRatings: number;
  averageRating: number;
  ratingDistribution: number[];
}

interface ProductAverageRating {
  productId: number;
  averageRating: number;
  ratingCount: number;
  ratingSum: number;
}
export interface TopRatedProduct {
  id: number;
  name: string;
  brand?: string;
  price: number;
  discountedPrice?: number;
  category?: string;
  subCategory?: string;
  images?: string[];
  averageRating: number;
  ratingCount: number;
  
}

interface TopRatedProductApiResponse {
  Id: number;
  Name: string;
  Brand?: string;
  Price: number;
  DiscountedPrice?: number;
  DiscountPercentage?: number;
  Category?: string;
  SubCategory?: string;
  Quantity?: number;
  Warranty?: string;
  Images?: string[];
  AverageRating: number;
  RatingCount: number;
  CreatedAt: string;
}

export interface TopRatedProduct {
  id: number;
  name: string;
  brand?: string;
  price: number;
  discountedPrice?: number;
  discountPercentage?: number;
  category?: string;
  subCategory?: string;
  quantity?: number;
  warranty?: string;
  images?: string[];
  averageRating: number;
  ratingCount: number;
  ratingSum?: number;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RatingService {
  private apiUrl = 'https://localhost:7233/api/Rating';
  
  private productRatingState = new BehaviorSubject<ProductRatingUpdate | null>(null);
  ratingState$ = this.productRatingState.asObservable();

  private userRatingsCache = new Map<number, number>();

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

 

  updateRatingState(update: ProductRatingUpdate) {
    this.userRatingsCache.set(update.productId, update.userRating);
    this.productRatingState.next(update);
  }

  rateProduct(productId: number, rating: number): Observable<RatingResponse> {
    const headers = this.getAuthHeaders();
    const ratingDto: RatingDto = {
      productId: productId,
      rating: rating
    };

    return this.http.post<RatingResponse>(
      `${this.apiUrl}`,
      ratingDto,
      { headers }
    ).pipe(
      tap(response => {
        this.userRatingsCache.set(productId, response.value);
        
        this.getProductAverageRating(productId).subscribe(avgData => {
          this.updateRatingState({
            productId,
            userRating: response.value,
            averageRating: avgData.averageRating,
            ratingCount: avgData.ratingCount
          });
        });
      }),
      catchError(error => {
        console.error('Rating error:', error);
        throw error;
      })
    );
  }

  updateRating(productId: number, rating: number): Observable<RatingResponse> {
    const headers = this.getAuthHeaders();
    const ratingDto: RatingDto = {
      productId: productId,
      rating: rating
    };

    return this.http.put<RatingResponse>(
      `${this.apiUrl}/product/${productId}`,
      ratingDto,
      { headers }
    ).pipe(
      tap(response => {
        this.userRatingsCache.set(productId, response.value);
        
        this.getProductAverageRating(productId).subscribe(avgData => {
          this.updateRatingState({
            productId,
            userRating: response.value,
            averageRating: avgData.averageRating,
            ratingCount: avgData.ratingCount
          });
        });
      }),
      catchError(error => {
        console.error('Update rating error:', error);
        throw error;
      })
    );
  }

  deleteRating(productId: number): Observable<void> {
    const headers = this.getAuthHeaders();
    
    return this.http.delete<void>(
      `${this.apiUrl}/product/${productId}`,
      { headers }
    ).pipe(
      tap(() => {
        this.userRatingsCache.delete(productId);
        
        this.getProductAverageRating(productId).subscribe(avgData => {
          this.updateRatingState({
            productId,
            userRating: 0,
            averageRating: avgData.averageRating,
            ratingCount: avgData.ratingCount
          });
        });
      }),
      catchError(error => {
        console.error('Delete rating error:', error);
        throw error;
      })
    );
  }

  getUserRatingForProduct(productId: number): Observable<number | null> {

  if (this.userRatingsCache.has(productId)) {
    const cachedRating = this.userRatingsCache.get(productId);
    console.log('Found cached rating for product', productId, ':', cachedRating);
    return of(cachedRating === 0 ? null : cachedRating || null);
  }

  const headers = this.getAuthHeaders();
  
  return this.getCurrentUserId().pipe(
    switchMap(userId => {
      if (!userId) {
        return of(null);
      }
      
      console.log('Fetching user rating for product', productId, 'and user', userId);
      
      return this.http.get<RatingResponse>(`${this.apiUrl}/user/${userId}/product/${productId}`, { headers })
        .pipe(
          map(response => {
            const rating = response.value;
            console.log('API returned rating:', rating);
            this.userRatingsCache.set(productId, rating);
            return rating;
          }),
          catchError(error => {
            console.log('Error fetching user rating:', error.status, error.message);
            if (error.status === 404) {
              console.log('No existing rating found, caching as 0');
              this.userRatingsCache.set(productId, 0);
              return of(null);
            }
            console.error('Error fetching user rating:', error);
            return of(null);
          })
        );
    })
  );
}


  getProductRatings(productId: number): Observable<UserRatingInfo[]> {
    return this.http.get<ProductRating[]>(`${this.apiUrl}/product/${productId}`)
      .pipe(
        map(ratings => {
          console.log('Raw ratings from API:', ratings);
          return ratings.map(rating => ({
            userId: rating.userId,
            productId: rating.productId,
            rating: rating.value,
            ratedAt: new Date(rating.ratedAt)
          }));
        }),
        catchError(error => {
          console.error('Error fetching product ratings:', error);
          return of([]);
        })
      );
  }

  getProductAverageRating(productId: number): Observable<ProductAverageRating> {
    return this.http.get<ProductAverageRating>(`${this.apiUrl}/product/${productId}/average`)
      .pipe(
        catchError(error => {
          console.error('Error fetching average rating:', error);
          return of({ 
            productId: productId, 
            averageRating: 0, 
            ratingCount: 0, 
            ratingSum: 0 
          });
        })
      );
  }

  getProductRatingStats(productId: number): Observable<RatingStats> {
    return this.http.get<RatingStats>(`${this.apiUrl}/product/${productId}/stats`)
      .pipe(
        catchError(error => {
          console.error('Error fetching rating stats:', error);
          return of({ 
            productId: productId,
            totalRatings: 0, 
            averageRating: 0, 
            ratingDistribution: [0, 0, 0, 0, 0] 
          });
        })
      );
  }

  getMyRatings(): Observable<UserRatingInfo[]> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<ProductRating[]>(`${this.apiUrl}/user/my-ratings`, { headers })
      .pipe(
        map(ratings => {
          return ratings.map(rating => ({
            userId: rating.userId,
            productId: rating.productId,
            rating: rating.value,
            ratedAt: new Date(rating.ratedAt)
          }));
        }),
        catchError(error => {
          console.error('Error fetching my ratings:', error);
          return of([]);
        })
      );
  }

    getTopRatedProducts(): Observable<TopRatedProduct[]> {
    return this.http.get<any[]>(`${this.apiUrl}/top-rated`).pipe(
      map(products => products.map(product => ({
        id: product.id,
        name: product.name,
        brand: product.brand,
        price: product.price,
        discountedPrice: product.discountedPrice,
        category: product.category,
        subCategory: product.subCategory,
        images: product.images,
        averageRating: product.averageRating,
        ratingCount: product.ratingCount
      }))),
      catchError(error => {
        console.error('Error fetching top rated products:', error);
        return of([]);
      })
    );
  }

  submitRating(productId: number, rating: number): Observable<RatingResponse> {
  return this.getUserRatingForProduct(productId).pipe(
    switchMap(existingRating => {
      console.log('Existing rating for product', productId, ':', existingRating);
      
      if (existingRating && existingRating > 0) {
       
        console.log('Updating existing rating');
        return this.updateRating(productId, rating);
      } else {
       
        console.log('Creating new rating');
        return this.rateProduct(productId, rating);
      }
    }),
    catchError(error => {
      console.error('Submit rating error:', error);
      
      
      if (error.status === 400 && error.error?.includes('already rated')) {
        console.log('Received "already rated" error, trying to update rating');
        return this.updateRating(productId, rating);
      }
      
      throw error;
    })
  );
}

  
  getAllProducts(): Observable<TopRatedProduct[]> {
    const url = `${this.apiUrl}/top-rated`;
    let params = new HttpParams()
      .set('limit', '20')
      .set('minRating', '0')
      .set('minRatingCount', '0');
    
    console.log('Getting all products:', `${url}?${params.toString()}`);
    
    return this.http.get<TopRatedProductApiResponse[]>(url, { params }).pipe(
      map(products => {
        return products.map(product => ({
          id: product.Id,
          name: product.Name || 'Unknown Product',
          brand: product.Brand || '',
          price: product.Price || 0,
          discountedPrice: product.DiscountedPrice || product.Price || 0,
          discountPercentage: product.DiscountPercentage || 0,
          category: product.Category || '',
          subCategory: product.SubCategory || '',
          quantity: product.Quantity || 0,
          warranty: product.Warranty || '',
          images: product.Images || [],
          averageRating: product.AverageRating || 0,
          ratingCount: product.RatingCount || 0,
          createdAt: product.CreatedAt || new Date().toISOString()
        }));
      }),
      tap(response => {
        console.log('All products response:', response);
      }),
      catchError(error => {
        console.error('All products error:', error);
        return of([]);
      })
    );
  }

  private getCurrentUserId(): Observable<number | null> {
    const token = localStorage.getItem('authToken');
    if (!token) {
      return of(null);
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.nameid || payload.sub || payload.userId;
      return of(userId ? parseInt(userId) : null);
    } catch (error) {
      console.error('Error decoding token:', error);
      return of(null);
    }
  }

  getProductRatingSummary(productId: number): Observable<{averageRating: number, ratingCount: number}> {
    return this.getProductAverageRating(productId).pipe(
      map(data => ({
        averageRating: data.averageRating,
        ratingCount: data.ratingCount
      }))
    );
  }

  getProductRatingsFromComments(): Observable<UserRatingInfo[]> {
    return of([]);
  }

  clearCache(): void {
    this.userRatingsCache.clear();
  }

  getCachedUserRating(productId: number): number | null {
    const cached = this.userRatingsCache.get(productId);
    return cached === 0 ? null : cached || null;
  }
}