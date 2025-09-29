import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { map, catchError, tap } from 'rxjs/operators';

export interface CartItem {
  id: number;
  userId?: number;
  productId?: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  quantityAvailable?: number;
  addedAt?: string;
  totalPrice?: number;
}

// Interface for adding products to cart (from product cards)
export interface ProductToAdd {
  id: number; // This is the product ID
  name: string;
  price: number;
  quantity?: number;
  image?: string;
  quantityAvailable: number;
}

// ... other interfaces remain the same ...
export interface OrderStatistics {
  productId: number;
  totalOrders: number;
  totalQuantity: number;
  lastOrderDate: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  brand: string;
  quantity: number;
  category: string;
  subCategory: string;
  images: string[];
  warranty: number;
}

export interface CountryStatistics {
  country: string;
  orderCount: number;
  totalRevenue: number;
  percentage: number;
}

export interface Order {
  id: number;
  userId: number;
  orderDate: string;
  totalPrice: number;
  totalAmount: number;
  deliveryType: string;
  deliveryDate?: string;
  email: string;
  location: string;
  orderItems: OrderItem[];
  user?: any; 
}

export interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  price: number;
  product?: Product;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItems: CartItem[] = [];
  private cartItemsSubject = new BehaviorSubject<CartItem[]>([]);
  cartItems$ = this.cartItemsSubject.asObservable();

  private apiUrl = 'https://localhost:7233/api/order';
  private cartApiUrl = 'https://localhost:7233/api/cart';
  private currentUserId: number = 1; 

  constructor(private http: HttpClient) {
    this.loadCartFromServer();
  }

  setCurrentUserId(userId: number): void {
    this.currentUserId = userId;
    this.loadCartFromServer();
  }

  private loadCartFromServer(): void {
    if (this.currentUserId) {
      this.http.get<CartItem[]>(`${this.cartApiUrl}/user/${this.currentUserId}`).pipe(
        catchError(error => {
          console.error('Error loading cart from server:', error);
          return of([]);
        })
      ).subscribe(items => {
        this.cartItems = items;
        this.cartItemsSubject.next([...this.cartItems]);
      });
    }
  }

  // FIXED: This method now properly handles products vs cart items
  addToCart(productOrCartItem: ProductToAdd | CartItem): void {
    // Determine if this is a product (from product card) or existing cart item
    const isProduct = !('userId' in productOrCartItem) && !('productId' in productOrCartItem);
    
    let productId: number;
    let productData: ProductToAdd;
    
    if (isProduct) {
      // This is a product from product card
      productData = productOrCartItem as ProductToAdd;
      productId = productData.id;
    } else {
      // This is a cart item
      const cartItem = productOrCartItem as CartItem;
      productId = cartItem.productId || cartItem.id;
      productData = {
        id: productId,
        name: cartItem.name,
        price: cartItem.price,
        image: cartItem.image,
        quantityAvailable: cartItem.quantityAvailable || 0
      };
    }

    // Check if item already exists in cart (by productId, not cart item id)
    const existing = this.cartItems.find(item => item.productId === productId);
    const maxQuantity = productData.quantityAvailable;

    if (existing) {
      // Update existing item
      const newQuantity = existing.quantity + (productData.quantity || 1);
      
      if (newQuantity > maxQuantity) {
        console.warn(`Cannot add more than available stock (${maxQuantity})`);
        return;
      }

      this.updateQuantityOnServer(existing.id, newQuantity).subscribe({
        next: () => {
          existing.quantity = newQuantity;
          this.cartItemsSubject.next([...this.cartItems]);
        },
        error: (error) => {
          console.error('Error updating quantity on server:', error);
        }
      });
    } else {
      // Add new item
      const quantityToAdd = productData.quantity || 1;
      
      if (quantityToAdd > maxQuantity) {
        console.warn(`Cannot add more than available stock (${maxQuantity})`);
        return;
      }

      const newCartItem: Partial<CartItem> = {
        userId: this.currentUserId,
        productId: productId,
        name: productData.name,
        price: productData.price,
        quantity: quantityToAdd,
        quantityAvailable: maxQuantity
      };

      this.http.post<CartItem>(this.cartApiUrl, newCartItem).pipe(
        catchError(error => {
          console.error('Error adding item to cart:', error);
          return of(null);
        })
      ).subscribe(serverItem => {
        if (serverItem) {
          this.cartItems.push(serverItem);
          this.cartItemsSubject.next([...this.cartItems]);
        }
      });
    }
  }

  getCartItems(): CartItem[] {
    return [...this.cartItems];
  }

  // FIXED: Use productId to find items, not cart item id
  updateQuantity(productId: number, quantity: number): void {
    const item = this.cartItems.find(p => p.productId === productId);
    if (item) {
      const maxQuantity = item.quantityAvailable ?? Infinity;
      const newQuantity = Math.min(quantity, maxQuantity);

      if (newQuantity <= 0) {
        this.removeFromCart(productId);
      } else {
        this.updateQuantityOnServer(item.id, newQuantity).subscribe({
          next: () => {
            item.quantity = newQuantity;
            this.cartItemsSubject.next([...this.cartItems]);
          },
          error: (error) => {
            console.error('Error updating quantity on server:', error);
          }
        });
      }
    }
  }

  // FIXED: Use productId to find items
  removeFromCart(productId: number): void {
    const item = this.cartItems.find(p => p.productId === productId);
    if (item) {
      this.http.delete(`${this.cartApiUrl}/${item.id}`).pipe(
        catchError(error => {
          console.error('Error removing item from cart:', error);
          return of(null);
        })
      ).subscribe(() => {
        this.cartItems = this.cartItems.filter(p => p.productId !== productId);
        this.cartItemsSubject.next([...this.cartItems]);
      });
    }
  }

  clearCart(): void {
    this.http.delete(`${this.cartApiUrl}/user/${this.currentUserId}`).pipe(
      catchError(error => {
        console.error('Error clearing cart:', error);
        return of(null);
      })
    ).subscribe(() => {
      this.cartItems = [];
      this.cartItemsSubject.next([]);
    });
  }

  getCartItemsFromServer(): Observable<CartItem[]> {
    return this.http.get<CartItem[]>(`${this.cartApiUrl}/user/${this.currentUserId}`).pipe(
      tap(items => {
        this.cartItems = items;
        this.cartItemsSubject.next([...this.cartItems]);
      }),
      catchError(error => {
        console.error('Error fetching cart items:', error);
        return of(this.cartItems); 
      })
    );
  }

  // FIXED: Use productId to find items
  removeFromServer(productId: number): Observable<void> {
    const item = this.cartItems.find(p => p.productId === productId);
    if (item) {
      return this.http.delete<void>(`${this.cartApiUrl}/${item.id}`).pipe(
        tap(() => {
          this.cartItems = this.cartItems.filter(p => p.productId !== productId);
          this.cartItemsSubject.next([...this.cartItems]);
        }),
        catchError(error => {
          console.error('Error removing from server:', error);
          // Fallback: remove locally
          this.cartItems = this.cartItems.filter(p => p.productId !== productId);
          this.cartItemsSubject.next([...this.cartItems]);
          return of(void 0);
        })
      );
    }
    return of(void 0);
  }

  updateQuantityOnServer(cartItemId: number, quantity: number): Observable<void> {
    return this.http.put<void>(`${this.cartApiUrl}/${cartItemId}`, quantity).pipe(
      catchError(error => {
        console.error('Error updating quantity on server:', error);
        return of(void 0);
      })
    );
  }

  getCartTotal(): Observable<number> {
    return this.http.get<number>(`${this.cartApiUrl}/total/${this.currentUserId}`).pipe(
      catchError(error => {
        console.error('Error getting cart total:', error);
        const total = this.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        return of(total);
      })
    );
  }

  getCartCount(): Observable<number> {
    return this.http.get<number>(`${this.cartApiUrl}/count/${this.currentUserId}`).pipe(
      catchError(error => {
        console.error('Error getting cart count:', error);
        const count = this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
        return of(count);
      })
    );
  }

  // ... rest of your methods remain the same ...
  submitOrder(order: any): Observable<any> {
    return this.http.post(`${this.apiUrl}`, order).pipe(
      tap(() => {
        this.clearCart();
      })
    );
  }

  getOrdersByUserId(userId: number): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/user/${userId}`).pipe(
      catchError(error => {
        console.error(`Error fetching orders for user ${userId}:`, error);
        return of([]);
      })
    );
  }

  getOrderById(orderId: number): Observable<Order | null> {
    return this.http.get<Order>(`${this.apiUrl}/${orderId}`).pipe(
      catchError(error => {
        console.error(`Error fetching order ${orderId}:`, error);
        return of(null);
      })
    );
  }

  getAllOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}`).pipe(
      catchError(error => {
        console.error('Error fetching all orders:', error);
        return of([]);
      })
    );
  }

  getOrderCountForProduct(productId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/product/${productId}/count`).pipe(
      catchError(error => {
        console.error(`Error fetching order count for product ${productId}:`, error);
        return of(0);
      })
    );
  }

  getOrderStatistics(productIds: number[]): Observable<OrderStatistics[]> {
    return this.http.post<OrderStatistics[]>(`${this.apiUrl}/statistics`, { productIds }).pipe(
      catchError(error => {
        console.error('Error fetching order statistics:', error);
        return of([]);
      })
    );
  }

  getMostPopularProducts(limit: number = 20): Observable<OrderStatistics[]> {
    return this.http.get<OrderStatistics[]>(`${this.apiUrl}/popular-products?limit=${limit}`).pipe(
      catchError(error => {
        console.error('Error fetching popular products:', error);
        return of([]);
      })
    );
  }
  
  getOrderCountries(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/countries`).pipe(
      catchError(error => {
        console.error('Error fetching order countries:', error);
        return of([]);
      })
    );
  }

  getTopCountries(): Observable<{ country: string, orderCount: number }[]> {
    return this.http.get<{ country: string, orderCount: number }[]>(`${this.apiUrl}/countries/top`).pipe(
      catchError(error => {
        console.error('Error fetching top countries:', error);
        return of([]);
      })
    );
  }

  getAllOrderStatistics(): Observable<OrderStatistics[]> {
    return this.http.get<OrderStatistics[]>(`${this.apiUrl}/all-statistics`).pipe(
      catchError(error => {
        console.error('Error fetching all order statistics:', error);
        return of([]);
      })
    );
  }

  getOrdersByDateRange(startDate: string, endDate: string): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/date-range?start=${startDate}&end=${endDate}`).pipe(
      catchError(error => {
        console.error('Error fetching orders by date range:', error);
        return of([]);
      })
    );
  }

  getTrendingProducts(days: number = 30, limit: number = 10): Observable<OrderStatistics[]> {
    return this.http.get<OrderStatistics[]>(`${this.apiUrl}/trending?days=${days}&limit=${limit}`).pipe(
      catchError(error => {
        console.error('Error fetching trending products:', error);
        return of([]);
      })
    );
  }

  updateOrderDeliveryType(orderId: number, deliveryType: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${orderId}/delivery-type`, JSON.stringify(deliveryType), {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      catchError(error => {
        console.error(`Error updating delivery type for order ${orderId}:`, error);
        return of(void 0);
      })
    );
  }

  deleteOrder(orderId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${orderId}`).pipe(
      catchError(error => {
        console.error(`Error deleting order ${orderId}:`, error);
        return of(void 0);
      })
    );
  }

  calculatePopularityFromOrders(orders: Order[]): OrderStatistics[] {
    const productOrderMap = new Map<number, { count: number; totalQuantity: number; lastOrder: string }>();

    orders.forEach(order => {
      if (order.orderItems && Array.isArray(order.orderItems)) {
        order.orderItems.forEach((item: OrderItem) => {
          const existing = productOrderMap.get(item.productId) || { count: 0, totalQuantity: 0, lastOrder: '' };
          existing.count += 1;
          existing.totalQuantity += item.quantity || 1;

          if (!existing.lastOrder || new Date(order.orderDate) > new Date(existing.lastOrder)) {
            existing.lastOrder = order.orderDate;
          }

          productOrderMap.set(item.productId, existing);
        });
      }
    });

    const statistics: OrderStatistics[] = [];
    productOrderMap.forEach((data, productId) => {
      statistics.push({
        productId,
        totalOrders: data.count,
        totalQuantity: data.totalQuantity,
        lastOrderDate: data.lastOrder
      });
    });

    return statistics.sort((a, b) => b.totalOrders - a.totalOrders);
  }

  getOrderStatus(order: Order): number {
    const now = new Date();
    const orderDate = new Date(order.orderDate);
    const deliveryDate = order.deliveryDate ? new Date(order.deliveryDate) : null;

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const orderDay = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
    const deliveryDay = deliveryDate ? new Date(deliveryDate.getFullYear(), deliveryDate.getMonth(), deliveryDate.getDate()) : null;

    if (!deliveryDay) {
      return 1;
    }

    if (today >= deliveryDay) {
      return 3;
    }

    if (today > orderDay) {
      return 2;
    }

    return 1;
  }

  getProgressWidth(order: Order): number {
    const status = this.getOrderStatus(order);
    switch (status) {
      case 1:
        return 0;
      case 2:
        return 50;
      case 3:
        return 100;
      default:
        return 0;
    }
  }

  getStatusText(order: Order): string {
    const status = this.getOrderStatus(order);
    switch (status) {
      case 1:
        return 'Ordered';
      case 2:
        return 'In Transit';
      case 3:
        return 'Delivered';
      default:
        return 'Unknown';
    }
  }
}