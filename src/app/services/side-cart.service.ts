import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Product } from './product.service';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItems: Product[] = [];
  cartItems$ = new BehaviorSubject<Product[]>([]);

  addToCart(product: Product): void {
    this.cartItems.push(product);
    this.cartItems$.next(this.cartItems);
  }

  getCartItems(): Product[] {
    return this.cartItems;
  }

  clearCart(): void {
    this.cartItems = [];
    this.cartItems$.next(this.cartItems);
  }
}
