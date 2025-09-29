import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { FavoritesService } from '../services/favorites.service';
import { CartService, CartItem } from '../services/cart.service';
import { Product } from '../services/product.service';
import { MyOrdersComponent } from '../my-orders/my-orders.component'; 
import { FavoriteCardComponent } from '../favorite-card/favorite-card.component'; 

import { Subscription } from 'rxjs';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
   MyOrdersComponent,
    FavoriteCardComponent 
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {
  selectedTab: string = 'profile';
  userId: number = 0; 
  user: any = null;
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  savedItems: Product[] = [];
  private subscription?: Subscription;

  constructor(
    private http: HttpClient, 
    private router: Router,
    private favoritesService: FavoritesService,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    
    this.getCurrentUserId();
    
    
    console.log('Current userId:', this.userId);
    
    if (this.userId > 0) {
      this.getUserInfo();
      
      this.subscription = this.favoritesService.favorites$.subscribe(favorites => {
        this.savedItems = favorites;
      });
    } else {
     
      console.error('No valid user ID found. Available storage:');
      console.log('localStorage:', localStorage);
      console.log('sessionStorage:', sessionStorage);
      
      
      console.warn('Using fallback userId = 1 for debugging');
      this.userId = 1;
      this.getUserInfo();
      
      this.subscription = this.favoritesService.favorites$.subscribe(favorites => {
        this.savedItems = favorites;
      });
      
      
    }
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  
  getCurrentUserId(): void {
    console.log('=== DEBUGGING USER ID RETRIEVAL ===');
    
    
    console.log('All localStorage keys:', Object.keys(localStorage));
    console.log('All sessionStorage keys:', Object.keys(sessionStorage));
    
   
    const userData = localStorage.getItem('user');
    console.log('localStorage user data:', userData);
    
    if (userData) {
      try {
        const user = JSON.parse(userData);
        console.log('Parsed user object:', user);
        this.userId = user.id || user.userId;
        if (this.userId) {
          console.log('Found userId from localStorage user object:', this.userId);
          return;
        }
      } catch (error) {
        console.error('Error parsing user data from localStorage:', error);
      }
    }

    
    const possibleKeys = ['userId', 'user_id', 'id', 'currentUserId', 'loggedInUserId'];
    for (const key of possibleKeys) {
      const value = localStorage.getItem(key);
      if (value) {
        console.log(`Found ${key} in localStorage:`, value);
        this.userId = parseInt(value, 10);
        if (this.userId > 0) {
          console.log('Using userId:', this.userId);
          return;
        }
      }
      
      const sessionValue = sessionStorage.getItem(key);
      if (sessionValue) {
        console.log(`Found ${key} in sessionStorage:`, sessionValue);
        this.userId = parseInt(sessionValue, 10);
        if (this.userId > 0) {
          console.log('Using userId:', this.userId);
          return;
        }
      }
    }

    
    const possibleTokenKeys = ['token', 'authToken', 'accessToken', 'jwt', 'authorization'];
    for (const tokenKey of possibleTokenKeys) {
      const token = localStorage.getItem(tokenKey);
      if (token) {
        console.log(`Found ${tokenKey} in localStorage:`, token.substring(0, 20) + '...');
        try {
          
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('JWT payload:', payload);
          this.userId = payload.userId || payload.id || payload.sub;
          if (this.userId) {
            console.log('Found userId from JWT token:', this.userId);
            return;
          }
        } catch (error) {
          console.error(`Error decoding JWT token ${tokenKey}:`, error);
        }
      }
    }

    console.error('=== NO VALID USER ID FOUND ===');
    console.log('Please check how you store user information after login');
  }

  selectTab(tabName: string): void {
    this.selectedTab = tabName;
    this.errorMessage = '';
    this.successMessage = '';
  }

  getUserInfo(): void {
    if (this.userId <= 0) {
      this.errorMessage = 'Invalid user ID';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.http.get<any>(`https://localhost:7233/api/users/${this.userId}`)
      .subscribe({
        next: (data) => {
          this.user = data;
          this.isLoading = false;
        },
        error: (err: HttpErrorResponse) => {
          console.error('Failed to load user info:', err);
          this.errorMessage = 'Failed to load profile information. Please try again.';
          if (err.status === 404) {
            this.errorMessage = 'User not found.';
          } else if (err.status === 401) {
            this.errorMessage = 'Unauthorized access. Please login again.';
            this.router.navigate(['/login']);
          }
          this.isLoading = false;
        }
      });
  }

  saveProfile(): void {
    if (!this.user || this.userId <= 0) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const userUpdate = {
      ...this.user,
      name: this.user.name,
      lastName: this.user.lastName,
      address: this.user.address
    };

    this.http.put(`https://localhost:7233/api/users/${this.userId}`, userUpdate)
      .subscribe({
        next: () => {
          this.successMessage = 'Profile updated successfully!';
          this.isLoading = false;
          this.getUserInfo();
        },
        error: (err: HttpErrorResponse) => {
          console.error('Update failed:', err);
          this.isLoading = false;
          if (err.status === 400) {
            if (err.error.errors) {
              this.errorMessage = 'Validation errors:';
              for (const field in err.error.errors) {
                this.errorMessage += `\n${field}: ${err.error.errors[field].join(', ')}`;
              }
            } else {
              this.errorMessage = err.error?.title || 'Invalid request';
            }
          } else if (err.status === 401) {
            this.errorMessage = 'Unauthorized - please login again';
            this.router.navigate(['/login']);
          } else {
            this.errorMessage = err.error?.message || 'Failed to update profile. Please try again.';
          }
        }
      });
  }

  removeFromFavorites(productId: number): void {
    this.favoritesService.removeFromFavorites(productId).subscribe({
      next: (response) => {
        console.log('Item removed from favorites:', response);
      },
      error: (error) => {
        console.error('Error removing item from favorites:', error);
      }
    });
  }

  onAddToBasketClick(event: Event, product: Product): void {
    event.preventDefault();
    event.stopPropagation();
    
    const cartItem: CartItem & { quantityAvailable: number } = {
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.images?.[0] ?? '',
      quantityAvailable: product.quantity || 1
    };

    const existing = this.cartService.getCartItems().find(p => p.id === cartItem.id);
    if (existing && existing.quantity >= cartItem.quantityAvailable) {
      console.log(`Cannot add more than available stock (${cartItem.quantityAvailable})`);
      return;
    }

    this.cartService.addToCart(cartItem);
    console.log('Added to cart:', product.name);
  }

  logout(): void {
    localStorage.clear();
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }
}
