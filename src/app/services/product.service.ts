
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse , HttpParams} from '@angular/common/http';

import { Observable, map, catchError, throwError } from 'rxjs';

export interface Product {
  id: number;
  name: string;
  brand: string;
  price: number;
  discountedPrice?: number;
  discountPercentage?: number;
  category: string;
  subCategory: string;
  quantity: number;
  warranty: string;
  images: string[];
  createdAt: string;
  rating?: number;
  ratingCount?: number;
  userRating?: number;
  averageRating?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = 'https://localhost:7233/api/products';

  constructor(private http: HttpClient) {}

  getAllProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl).pipe(
      catchError(this.handleError)
    );
  }

  getProductById(id: number): Observable<Product> {
    if (!id || id <= 0) {
      return throwError(() => new Error('Invalid product ID'));
    }
    
    return this.http.get<Product>(`${this.apiUrl}/${id}`).pipe(
      map(product => {
       
        return {
          ...product,
          images: product.images || [],
          averageRating: product.averageRating || product.rating || 0,
          ratingCount: product.ratingCount || 0
        };
      }),
      catchError(this.handleError)
    );
  }

  getProductsByCategory(category: string): Observable<Product[]> {
    if (!category || category.trim() === '') {
      return throwError(() => new Error('Category cannot be empty'));
    }

   
    return this.http.get<Product[]>(`${this.apiUrl}/by-category/${encodeURIComponent(category.trim())}`).pipe(
      map(products => {
        if (!Array.isArray(products)) {
          return [];
        }
        return products;
      }),
      catchError(this.handleError)
    );
  }

  getBrandsByCategory(category: string): Observable<string[]> {
    if (!category || category.trim() === '') {
      return throwError(() => new Error('Category cannot be empty'));
    }

    return this.http.get<string[]>(`${this.apiUrl}/brands/by-category/${encodeURIComponent(category.trim())}`).pipe(
      map(brands => {
        if (!Array.isArray(brands)) {
          return [];
        }
        return brands;
      }),
      catchError(this.handleError)
    );
  }

  
  getNewlyAddedProducts(maxProducts: number = 20, daysBack: number = 30): Observable<Product[]> {
  if (maxProducts <= 0) {
    return throwError(() => new Error('Max products must be greater than 0'));
  }
    
  if (daysBack <= 0) {
    return throwError(() => new Error('Days back must be greater than 0'));
  }
    
  const params = new HttpParams()
    .set('maxProducts', maxProducts.toString())
    .set('daysBack', daysBack.toString());
    
  return this.http.get<Product[]>(`${this.apiUrl}/newly-added`, { params }).pipe(
    map(products => {
      if (!Array.isArray(products)) {
        return [];
      }
      return products.map(product => ({
        ...product,
        images: product.images || [],
        averageRating: product.averageRating || product.rating || 0,
        ratingCount: product.ratingCount || 0
      }));
    }),
    catchError(this.handleError)
  );
}

  addProduct(product: Product): Observable<Product> {
    if (!product) {
      return throwError(() => new Error('Product data is required'));
    }

   
    if (!product.name || !product.price || !product.category) {
      return throwError(() => new Error('Missing required product fields'));
    }

    
    const standardizedProduct = {
      ...product,
      category: this.formatCategory(product.category),
      images: product.images || []
    };
    
    return this.http.post<Product>(this.apiUrl, standardizedProduct).pipe(
      catchError(this.handleError)
    );
  }

  updateProduct(id: number, product: Product): Observable<Product> {
    if (!id || id <= 0) {
      return throwError(() => new Error('Invalid product ID'));
    }
    
    if (!product) {
      return throwError(() => new Error('Product data is required'));
    }

    const standardizedProduct = {
      ...product,
      id: id, 
      category: this.formatCategory(product.category),
      images: product.images || []
    };
    
    return this.http.put<Product>(`${this.apiUrl}/${id}`, standardizedProduct).pipe(
      catchError(this.handleError)
    );
  }

  bulkUpdateProducts(products: Product[]): Observable<any> {
    if (!products || products.length === 0) {
      return throwError(() => new Error('Products array is required'));
    }

    return this.http.put<any>(`${this.apiUrl}/bulk-update`, products).pipe(
      catchError(this.handleError)
    );
  }

  applyDiscount(productId: number, discountPercentage: number): Observable<any> {
    if (!productId || productId <= 0) {
      return throwError(() => new Error('Invalid product ID'));
    }

    if (discountPercentage < 1 || discountPercentage > 100) {
      return throwError(() => new Error('Discount percentage must be between 1 and 100'));
    }

    return this.http.put<any>(`${this.apiUrl}/${productId}/discount`, discountPercentage).pipe(
      catchError(this.handleError)
    );
  }

  removeDiscount(productId: number): Observable<any> {
    if (!productId || productId <= 0) {
      return throwError(() => new Error('Invalid product ID'));
    }

    return this.http.delete<any>(`${this.apiUrl}/${productId}/discount`).pipe(
      catchError(this.handleError)
    );
  }

  deleteProduct(id: number): Observable<void> {
    if (!id || id <= 0) {
      return throwError(() => new Error('Invalid product ID'));
    }
    
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  private formatCategory(category: string): string {
    if (!category) return '';
  
    return category.toLowerCase().trim();
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
   
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
   
      switch (error.status) {
        case 0:
          errorMessage = 'Unable to connect to server. Please check if the API is running.';
          break;
        case 404:
          errorMessage = 'Product not found.';
          break;
        case 400:
          errorMessage = 'Bad request. Please check your data.';
          break;
        case 401:
          errorMessage = 'Unauthorized access.';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        default:
          errorMessage = `Server Error: ${error.status} - ${error.message}`;
      }
    }
    
    console.error('ProductService Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}