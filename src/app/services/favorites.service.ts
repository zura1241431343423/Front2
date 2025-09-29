import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Product } from './product.service';

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private apiUrl = 'https://localhost:7233/api/favorites';
  private favoritesSubject = new BehaviorSubject<Product[]>([]);
  public favorites$ = this.favoritesSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadFavorites();
  }

  private loadFavorites(): void {
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
      try {
        const favorites: Product[] = JSON.parse(savedFavorites);
        this.favoritesSubject.next(favorites);
      } catch (error) {
        console.error('Error parsing favorites from localStorage:', error);
      }
    }
  }

  getFavorites(): Product[] {
    return this.favoritesSubject.value;
  }

  isFavorite(productId: number): boolean {
    return this.favoritesSubject.value.some(fav => fav.id === productId);
  }

  addToFavorites(product: Product): Observable<any> {
    const currentFavorites = this.favoritesSubject.value;
    const isAlreadyFavorite = currentFavorites.some(fav => fav.id === product.id);

    if (!isAlreadyFavorite) {
      const updatedFavorites = [...currentFavorites, product];
      this.favoritesSubject.next(updatedFavorites);
      localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
      return new Observable(observer => {
        observer.next({ success: true });
        observer.complete();
      });
    }

    return new Observable(observer => {
      observer.next({ success: false, message: 'Already in favorites' });
      observer.complete();
    });
  }

  removeFromFavorites(productId: number): Observable<any> {
    const currentFavorites = this.favoritesSubject.value;
    const updatedFavorites = currentFavorites.filter(fav => fav.id !== productId);
    this.favoritesSubject.next(updatedFavorites);
    localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
    return new Observable(observer => {
      observer.next({ success: true });
      observer.complete();
    });
  }

  toggleFavorite(product: Product): Observable<any> {
    if (this.isFavorite(product.id)) {
      return this.removeFromFavorites(product.id);
    } else {
      return this.addToFavorites(product);
    }
  }
}
