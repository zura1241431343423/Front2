import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { CartService, CartItem } from '../services/cart.service';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

interface Order {
  id: number;
  userId: number;
  orderDate: string;
  totalPrice: number;
  totalAmount: number;
  deliveryType: string;
  deliveryDate?: string;
  email: string;
  location: string;
}

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-order-menu',
  templateUrl: './order-menu.component.html',
  styleUrls: ['./order-menu.component.css']
  
})
export class OrderMenuComponent implements OnInit {
  orders: Order[] = [];
  loading = true;
  errorMessage = '';

  constructor(private cartService: CartService, private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchOrders();
  }

  fetchOrders(): void {
    this.loading = true;
    this.http.get<Order[]>('https://localhost:7233/api/order').subscribe({
      next: (response) => {
        this.orders = response;
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to fetch orders:', error);
        this.errorMessage = 'Failed to load orders.';
        this.loading = false;
      }
    });
  }
}

