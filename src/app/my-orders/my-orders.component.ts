import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService, Order } from '../services/cart.service'; 

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-orders.component.html',
  styleUrls: ['./my-orders.component.css']
})
export class MyOrdersComponent implements OnInit {
  orders: Order[] = [];
  loading = true;
  errorMessage = '';

  constructor(private cartService: CartService) {}

  ngOnInit(): void {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      this.errorMessage = 'User not logged in.';
      this.loading = false;
      return;
    }

    this.loadUserOrders(parseInt(userId, 10));
  }

  private loadUserOrders(userId: number): void {
    this.cartService.getOrdersByUserId(userId).subscribe({
      next: (orders) => {
        this.orders = orders;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching user orders:', err);
        this.errorMessage = 'Failed to load your orders.';
        this.loading = false;
      }
    });
  }

  
  getOrderStatus(order: Order): number {
    return this.cartService.getOrderStatus(order);
  }

  
  getProgressWidth(order: Order): number {
    return this.cartService.getProgressWidth(order);
  }

  
  getStatusText(order: Order): string {
    return this.cartService.getStatusText(order);
  }

  
  refreshOrders(): void {
    const userId = localStorage.getItem('userId');
    if (userId) {
      this.loading = true;
      this.errorMessage = '';
      this.loadUserOrders(parseInt(userId, 10));
    }
  }

  
  formatDeliveryType(deliveryType: string): string {
    if (!deliveryType) return 'Standard';
    
    switch (deliveryType.toLowerCase()) {
      case 'flash':
        return 'Flash Delivery';
      case 'standard':
        return 'Standard Delivery';
      case 'nominated':
        return 'Nominated Delivery';
      default:
        return deliveryType;
    }
  }

  
  getTotalItems(order: Order): number {
    return order.orderItems?.reduce((total, item) => total + item.quantity, 0) || 0;
  }

  
  trackByOrderId(index: number, order: Order): number {
    return order.id;
  }
}
