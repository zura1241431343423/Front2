import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import maplibregl, { Map, Marker } from 'maplibre-gl';
import { CommonModule } from '@angular/common';
import { CartService, CartItem } from '../services/cart.service';
import { HttpClient } from '@angular/common/http';
import { CurrencyService } from '../services/currency-service.service';
import { Currency } from '../currency-changer/currency-changer.component';
import { PaymentComponent } from '../payment/payment.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, PaymentComponent],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit, AfterViewInit, OnDestroy {
  private map!: Map;
  private marker: Marker | null = null;
  private isTypingManually = false;
  private typingTimeout: ReturnType<typeof setTimeout> | null = null;
  private currencySubscription!: Subscription;
  private cartSubscription!: Subscription;

  cartItems: CartItem[] = [];
  selectedDeliveryType: string = 'standard';
  currentCurrency!: Currency;
  isLoading = true;

  constructor(
    private cartService: CartService,
    private http: HttpClient,
    private currencyService: CurrencyService 
  ) {}

  ngOnInit(): void {
    this.initializeCartService();
    this.loadCartItems();
    this.subscribeToCartChanges();
    this.subscribeToCurrencyChanges();
  }

  ngAfterViewInit(): void {
    this.initializeMap();
    this.setupLocationInputListener();
    const calendar = document.getElementById('nominatedDayCalendar') as HTMLInputElement;
    if (calendar) {
        calendar.style.display = this.selectedDeliveryType === 'nominated' ? 'block' : 'none';
    }
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
    
    if (this.currencySubscription) {
      this.currencySubscription.unsubscribe();
    }

    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
  }

  private initializeCartService(): void {
    
    const userIdString = localStorage.getItem('userId');
    if (userIdString) {
      const userId = parseInt(userIdString, 10);
      if (!isNaN(userId)) {
        this.cartService.setCurrentUserId(userId);
      }
    }
  }

  private loadCartItems(): void {
    this.isLoading = true;
    
    
    this.cartService.getCartItemsFromServer().subscribe({
      next: (items: CartItem[]) => {
        this.cartItems = items;
        this.isLoading = false;
        console.log('Cart items loaded from server:', items);
      },
      error: (error) => {
        console.error('Error loading cart items:', error);
        
        this.cartItems = this.cartService.getCartItems();
        this.isLoading = false;
      }
    });
  }

  private subscribeToCartChanges(): void {
    
    this.cartSubscription = this.cartService.cartItems$.subscribe(items => {
      this.cartItems = items;
    });
  }

  private subscribeToCurrencyChanges(): void {
    this.currencySubscription = this.currencyService.currentCurrency$.subscribe(currency => {
      this.currentCurrency = currency;
    });
  }

  getFormattedPrice(price: number): string {
    if (!this.currentCurrency) return '';
    const convertedPrice = this.currencyService.convertPrice(price, this.currentCurrency.code);
    return this.currencyService.format(convertedPrice, this.currentCurrency.code);
  }

  removeItem(productId: number): void {
  
    const cartItem = this.cartItems.find(item => item.productId === productId || item.id === productId);
    if (!cartItem) {
      console.warn('Cart item not found:', productId);
      return;
    }

    this.cartService.removeFromServer(cartItem.id).subscribe({
      next: () => {
        console.log('Item removed successfully');
       
      },
      error: (error) => {
        console.error('Error removing item:', error);
       
        this.cartItems = this.cartItems.filter(item => 
          item.id !== productId && item.productId !== productId
        );
      }
    });
  }

  updateQuantity(productId: number, quantity: number): void {
    const cartItem = this.cartItems.find(item => item.productId === productId || item.id === productId);
    if (!cartItem) {
      console.warn('Cart item not found for quantity update:', productId);
      return;
    }

   
    if (quantity > (cartItem.quantityAvailable || Infinity)) {
      alert(`Cannot exceed available quantity (${cartItem.quantityAvailable})`);
      return;
    }

    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }

    this.cartService.updateQuantityOnServer(cartItem.id, quantity).subscribe({
      next: () => {
        console.log('Quantity updated successfully');
       
        cartItem.quantity = quantity;
      },
      error: (error) => {
        console.error('Error updating quantity:', error);
        
        cartItem.quantity = quantity;
      }
    });
  }

  increaseQuantity(productId: number): void {
    const item = this.cartItems.find(item => item.productId === productId || item.id === productId);
    if (item) {
      const newQuantity = item.quantity + 1;
      
   
      if (item.quantityAvailable && newQuantity > item.quantityAvailable) {
        alert(`Cannot exceed available quantity (${item.quantityAvailable})`);
        return;
      }
      
      this.updateQuantity(productId, newQuantity);
    }
  }

  decreaseQuantity(productId: number): void {
    const item = this.cartItems.find(item => item.productId === productId || item.id === productId);
    if (item && item.quantity > 1) {
      const newQuantity = item.quantity - 1;
      this.updateQuantity(productId, newQuantity);
    }
  }

  getSubtotal(): number {
    return this.cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  getDeliveryPrice(): number {
    switch (this.selectedDeliveryType) {
      case 'flash': return 5.99;
      case 'nominated': return 7.99;
      default: return 0; 
    }
  }

  getTotalPrice(): number {
    return this.getSubtotal() + this.getDeliveryPrice();
  }

  onDeliveryTypeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedDeliveryType = select.value;

    const calendar = document.getElementById('nominatedDayCalendar') as HTMLInputElement;
    if (calendar) {
      calendar.style.display = this.selectedDeliveryType === 'nominated' ? 'block' : 'none';
      if (this.selectedDeliveryType !== 'nominated') {
        calendar.value = '';
      }
    }
  }

  submitOrder(): void {
    const userIdString = localStorage.getItem('userId');
    if (!userIdString) {
      alert('User is not logged in.');
      return;
    }

    const userId = parseInt(userIdString, 10);
    if (isNaN(userId)) {
      alert('Invalid User ID format.');
      return;
    }

    const emailInput = document.getElementById('email') as HTMLInputElement;
    const locationInput = document.getElementById('userLocation') as HTMLInputElement;
    const calendar = document.getElementById('nominatedDayCalendar') as HTMLInputElement;

    const userEmail = emailInput?.value?.trim();
    const userLocation = locationInput?.value?.trim();
    let nominatedDayValue: string | null = null;

    if (!userEmail || !userLocation) {
      alert('Please fill in Email and Location.');
      return;
    }

    if (this.selectedDeliveryType === 'nominated') {
      nominatedDayValue = calendar?.value; 
      if (!nominatedDayValue) {
        alert('Please select a date for nominated day delivery.');
        return;
      }
      const nominatedDateObj = new Date(nominatedDayValue);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (nominatedDateObj < today) {
        alert('Nominated delivery date cannot be in the past. Please select a valid date.');
        return;
      }
    }

    const totalAmount = this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
    if (this.cartItems.length === 0) {
        alert('Your cart is empty. Please add items to order.');
        return;
    }
    if (totalAmount <= 0 && this.cartItems.length > 0) {
        alert('One or more cart items have an invalid quantity (0 or less). Please check your cart.');
        return;
    }

    
    const orderPayload: any = { 
      userId: userId,
      email: userEmail,
      location: userLocation,
      deliveryType: this.selectedDeliveryType,
      items: this.cartItems.map(item => ({
        productId: item.productId || item.id, 
        price: item.price,
        quantity: item.quantity
      })),
      totalPrice: this.getTotalPrice(),
      totalAmount: totalAmount
    };

    if (this.selectedDeliveryType === 'nominated' && nominatedDayValue) {
      orderPayload.nominatedDate = nominatedDayValue; 
    }

    console.log('Submitting order payload:', JSON.stringify(orderPayload, null, 2));

    this.cartService.submitOrder(orderPayload).subscribe({
      next: (response: any) => { 
        console.log('Order submitted successfully!', response);
        alert(`Order submitted successfully! Your order ID is ${response.id}.\nDelivery Date: ${new Date(response.deliveryDate).toLocaleDateString()}`);

        
        this.cartService.clearCart(); 
        this.cartItems = []; 

        
        this.resetFormFields();
      },
      error: (err: any) => {
        console.error('Order submission failed. Payload was:', orderPayload, 'Error:', err);
        this.handleOrderError(err, orderPayload);
      }
    });
  }

  private resetFormFields(): void {
    const inputs = [
      'email', 'userLocation', 'userName', 'userLastName'
    ];

    inputs.forEach(id => {
      const input = document.getElementById(id) as HTMLInputElement;
      if (input) input.value = '';
    });

    const calendar = document.getElementById('nominatedDayCalendar') as HTMLInputElement;
    if (calendar) {
      calendar.value = '';
      calendar.style.display = 'none';
    }

    const deliveryTypeSelect = document.getElementById('deliveryType') as HTMLSelectElement;
    if (deliveryTypeSelect) {
      deliveryTypeSelect.value = 'standard';
    }
    this.selectedDeliveryType = 'standard';

    if (this.marker) {
      this.marker.remove();
      this.marker = null;
    }
  }

  private handleOrderError(err: any, orderPayload: any): void {
    let errorMessage = 'Failed to submit order. Please try again.';
    if (err.error) {
      if (typeof err.error === 'string') {
           errorMessage += `\nServer says: ${err.error}`;
      } else if (err.error.errors && typeof err.error.errors === 'object') {
        errorMessage += '\nDetails:\n';
        for (const key in err.error.errors) {
          if (err.error.errors.hasOwnProperty(key)) {
            errorMessage += `${key}: ${err.error.errors[key].join(', ')}\n`;
          }
        }
      } else if (err.error.title) {
         errorMessage += `\n${err.error.title}`;
         if(err.error.detail) errorMessage += `\n${err.error.detail}`;
      } else if (typeof err.error === 'object') {
         errorMessage += `\n${JSON.stringify(err.error)}`;
      }
    } else if (err.message) {
      errorMessage += `\n${err.message}`;
    }
    alert(errorMessage);
  }

  
  getCartItemCount(): number {
    return this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }

 
  isCartEmpty(): boolean {
    return this.cartItems.length === 0;
  }

  
  refreshCart(): void {
    this.loadCartItems();
  }

  private initializeMap(): void {
    this.map = new maplibregl.Map({
      container: 'mapContainer',
      style: 'https://api.maptiler.com/maps/basic-v2/style.json?key=5TSpvzKbt6yWxoEwuyCL',
      center: [13.4050, 52.52],
      zoom: 13
    });

    this.map.addControl(new maplibregl.NavigationControl());

    this.map.on('click', (e) => {
      const { lng, lat } = e.lngLat;

      if (this.marker) {
        this.marker.setLngLat([lng, lat]);
      } else {
        this.marker = new maplibregl.Marker({ draggable: true })
          .setLngLat([lng, lat])
          .addTo(this.map);
      }
      this.reverseGeocode(lat, lng);
    });
  }

  private reverseGeocode(lat: number, lng: number): void {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const address = data.address || {};
        const country = address.country || '';
        const city = address.city || address.town || address.village || '';
        const street = address.road || address.suburb || address.neighbourhood || '';

        const fullAddress = [country, city, street].filter(Boolean).join(', ');
        this.setLocationInput(fullAddress);
      })
      .catch((err) => {
        console.error('Reverse geocoding failed:', err);
        this.setLocationInput(`Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`);
      });
  }

  private setLocationInput(value: string): void {
    const input = document.getElementById('userLocation') as HTMLInputElement | null;
    if (input && !this.isTypingManually) {
      input.value = value;
    }
  }

  private setupLocationInputListener(): void {
    const input = document.getElementById('userLocation') as HTMLInputElement | null;
    if (input) {
      input.addEventListener('input', () => {
        this.isTypingManually = true;

        if (this.typingTimeout) {
          clearTimeout(this.typingTimeout);
        }

        this.typingTimeout = setTimeout(() => {
          this.isTypingManually = false;
        }, 2000);
      });
    }
  }
}