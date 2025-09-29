import { Component, OnInit } from '@angular/core';
import { CartService } from '../services/side-cart.service'; 
import { Product } from '../services/product.service';
import { CurrencyPipe } from '@angular/common';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-side-cart',
  standalone: true,
   imports: [CurrencyPipe,CommonModule],

  
  templateUrl: './side-cart.component.html',
  styleUrl: './side-cart.component.css'
})
export class SideCartComponent implements OnInit {
  isOpen = false;
  cartItems: Product[] = [];

  constructor(private cartService: CartService) {}

  ngOnInit(): void {
    this.cartService.cartItems$.subscribe(items => {
      this.cartItems = items;
    });
  }

  toggleCart(): void {
    this.isOpen = !this.isOpen;
  }

  buyAll(): void {
    alert('Buying all items...');
    this.cartService.clearCart();
  }
}
