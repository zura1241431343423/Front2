import { Component, Input, Output, EventEmitter, Renderer2, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router'; 
import { Product } from '../services/product.service';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { RatingService } from '../services/rating.service';
import { CartService, CartItem } from '../services/cart.service';
import { FavoritesService } from '../services/favorites.service';
import { UserService } from '../services/user.service';
import { CurrencyService } from '../services/currency-service.service';
import { Currency } from '../currency-changer/currency-changer.component';
import { RecommendationService } from '../services/recommendation.service';
import { Subscription } from 'rxjs';
import { ClickTrackingService } from '../services/click-tracking.service';


@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe],
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.css']
})
export class CardComponent implements OnInit, OnDestroy {
  @Input() product!: Product;
  @Output() ratingChanged = new EventEmitter<Product>();

  hoverRating = 0;
  localUserRating: number | null = null;
  errorMessage: string = '';
  isLoading: boolean = false;
  isFavorited = false;
  
  currentCurrency: Currency = { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1.0 };
  convertedPrice = 0;
  convertedOriginalPrice = 0;
  convertedDiscountedPrice = 0;
  
  private subscriptions = new Subscription();

  constructor(
    private ratingService: RatingService,
    private cartService: CartService,
    private favoritesService: FavoritesService,
    private userService: UserService,
    private currencyService: CurrencyService,
    private recommendationService: RecommendationService,
    private clickTrackingService: ClickTrackingService, 
    private renderer: Renderer2,
    private el: ElementRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isFavorited = this.favoritesService.isFavorite(this.product.id);
    
    this.subscriptions.add(
      this.favoritesService.favorites$.subscribe(() => {
        this.isFavorited = this.favoritesService.isFavorite(this.product.id);
      })
    );

    this.loadUserRating();

    this.subscriptions.add(
      this.ratingService.ratingState$.subscribe(update => {
        if (update && update.productId === this.product.id) {
          this.product.averageRating = update.averageRating;
          this.product.ratingCount = update.ratingCount;
          this.localUserRating = update.userRating;
          this.ratingChanged.emit(this.product);
        }
      })
    );

    this.subscriptions.add(
      this.currencyService.currentCurrency$.subscribe(
        (currency: Currency) => {
          this.currentCurrency = currency;
          this.updateConvertedPrices();
        }
      )
    );

    this.currentCurrency = this.currencyService.getCurrentCurrency();
    this.updateConvertedPrices();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private updateConvertedPrices(): void {
    if (this.product?.price && this.currentCurrency?.rate) {
      this.convertedOriginalPrice = this.product.price * this.currentCurrency.rate;
      
      if (this.product.discountedPrice) {
        this.convertedDiscountedPrice = this.product.discountedPrice * this.currentCurrency.rate;
        this.convertedPrice = this.convertedDiscountedPrice;
      } else {
        this.convertedPrice = this.convertedOriginalPrice;
      }
    }
  }

  hasDiscount(): boolean {
    return !!(this.product.discountedPrice && 
              this.product.discountPercentage && 
              this.product.discountedPrice < this.product.price);
  }

  getFormattedOriginalPrice(): string {
    return `${this.currentCurrency.symbol}${this.convertedOriginalPrice.toFixed(2)}`;
  }

  getFormattedDiscountedPrice(): string {
    return `${this.currentCurrency.symbol}${this.convertedDiscountedPrice.toFixed(2)}`;
  }

  getFormattedPrice(): string {
    if (this.hasDiscount()) {
      return this.getFormattedDiscountedPrice();
    }
    return `${this.currentCurrency.symbol}${this.convertedPrice.toFixed(2)}`;
  }

  getDiscountPercentage(): number {
    return this.product.discountPercentage || 0;
  }

  private loadUserRating(): void {
    if (!this.userService.isLoggedIn()) {
      return;
    }

    this.subscriptions.add(
      this.ratingService.getUserRatingForProduct(this.product.id).subscribe({
        next: (rating) => {
          this.localUserRating = rating;
          console.log(`User rating for product ${this.product.id}:`, rating);
        },
        error: (error) => {
          console.error('Error loading user rating:', error);
          this.localUserRating = null;
        }
      })
    );
  }

  goToProductProfile(event: Event): void {
    const target = event.target as HTMLElement;
    const interactiveElements = ['button', 'input', 'svg', 'path'];
    const isInteractiveElement = interactiveElements.some(tag => 
      target.tagName.toLowerCase() === tag || 
      target.closest('button') || 
      target.closest('.favorite') || 
      target.closest('.rating')
    );

    if (isInteractiveElement) {
      return; 
    }

  
    this.trackProductClick();
    
    this.router.navigate(['/product', this.product.id]);
  }

  
  private trackProductClick(): void {
    if (!this.product?.id) {
      console.warn('Product ID is missing, cannot track click');
      return;
    }

    
    if (!this.clickTrackingService.canTrackClicks()) {
      console.log('User not logged in or cannot track clicks for product:', this.product.id);
      return;
    }

    console.log('Tracking click for product:', this.product.id, 'subcategory:', this.product.subCategory);

    
    this.clickTrackingService.trackClick(this.product.id, this.product.subCategory)
      .subscribe({
        next: (response) => {
          console.log('✅ Product click tracked successfully:', response);
          
          this.clickTrackingService.notifyClickTracked();
        },
        error: (error) => {
          console.error('❌ Error tracking product click:', error);
          
          
        }
      });
  }

  get ratingCount(): number {
    return this.product.ratingCount || 0;
  }

  get displayRating(): number {
    return this.product.averageRating || 0;
  }

  get stars(): number[] {
    return Array(5).fill(0).map((_, i) => i + 1);
  }

  onStarHover(rating: number): void {
    if (!this.isLoading) {
      this.hoverRating = rating;
    }
  }

  onStarLeave(): void {
    if (!this.isLoading) {
      this.hoverRating = 0;
    }
  }

  setRating(rating: number): void {
    if (this.isLoading) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.ratingService.submitRating(this.product.id, rating).subscribe({
      next: (response) => {
        this.localUserRating = response.value;

        this.ratingService.getProductAverageRating(this.product.id).subscribe(avgData => {
          this.product = {
            ...this.product,
            averageRating: avgData.averageRating,
            ratingCount: avgData.ratingCount
          };

          this.ratingChanged.emit(this.product);
          this.isLoading = false;
        });
      },
      error: (err) => {
        console.error('Rating failed:', err);
        this.isLoading = false;

        if (err.status === 401) {
          this.errorMessage = 'Please login to rate products';
        } else if (err.error?.message) {
          this.errorMessage = err.error.message;
        } else {
          this.errorMessage = 'Failed to submit rating. Please try again.';
        }
      }
    });
  }

  isStarActive(index: number): boolean {
    if (this.isLoading) return false;
    
    const starNumber = index + 1;
    
    if (this.hoverRating > 0) {
      return starNumber <= this.hoverRating;
    }
    
    if (this.localUserRating !== null && this.localUserRating > 0) {
      return starNumber <= this.localUserRating;
    }
    
    return starNumber <= Math.round(this.displayRating);
  }

  onFavoriteClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.product) {
      console.warn('No product available to favorite.');
      return;
    }

    this.favoritesService.toggleFavorite(this.product).subscribe({
      next: (response) => {
        console.log('Favorite status updated:', response);
      },
      error: (error) => {
        console.error('Error updating favorite status:', error);
      }
    });
  }

  onAddToBasketClick(event: MouseEvent): void {
    event.stopPropagation();
    
    
    this.trackProductClick();
    
    const price = this.hasDiscount() ? this.product.discountedPrice! : this.product.price;
    
    const cartItem: CartItem & { quantityAvailable: number } = {
      id: this.product.id,
      name: this.product.name,
      price: price,
      quantity: 1,
      image: this.product.images?.[0] ?? '',
      quantityAvailable: this.product.quantity
    };

    const existing = this.cartService.getCartItems().find(p => p.id === cartItem.id);
    if (existing && existing.quantity >= cartItem.quantityAvailable) {
      console.log(`Cannot add more than available stock (${cartItem.quantityAvailable})`);
      return;
    }

    this.animateToCart(event);
    this.cartService.addToCart(cartItem);
  }

  private animateToCart(event: MouseEvent): void {
    const button = event.currentTarget as HTMLElement;
    const cartIcon = document.getElementById('cart-icon');
    
    if (!cartIcon) {
      console.warn('Cart icon not found for animation');
      return;
    }

    const flyingElement = this.renderer.createElement('div');
    this.renderer.addClass(flyingElement, 'flying-item');

    const buttonRect = button.getBoundingClientRect();
    const cartRect = cartIcon.getBoundingClientRect();
    const imageToFly = this.mainImage;

    this.renderer.setStyle(flyingElement, 'position', 'fixed');
    this.renderer.setStyle(flyingElement, 'z-index', '10000');
    this.renderer.setStyle(flyingElement, 'pointer-events', 'none');
    
    if (imageToFly && !imageToFly.includes('default-product-image')) {
      this.renderer.setStyle(flyingElement, 'background-image', `url(${imageToFly})`);
      this.renderer.setStyle(flyingElement, 'background-size', 'cover');
      this.renderer.setStyle(flyingElement, 'width', '40px');
      this.renderer.setStyle(flyingElement, 'height', '40px');
      this.renderer.setStyle(flyingElement, 'border-radius', '4px');
    } else {
      this.renderer.setStyle(flyingElement, 'background-color', '#3f51b5');
      this.renderer.setStyle(flyingElement, 'width', '50px');
      this.renderer.setStyle(flyingElement, 'height', '50px');
      this.renderer.setStyle(flyingElement, 'border-radius', '50%');
    }

    this.renderer.setStyle(flyingElement, 'left', `${buttonRect.left + buttonRect.width / 2 - 20}px`);
    this.renderer.setStyle(flyingElement, 'top', `${buttonRect.top}px`);
    this.renderer.setStyle(flyingElement, 'opacity', '1');
    this.renderer.setStyle(flyingElement, 'transform', 'scale(1)');

    this.renderer.appendChild(document.body, flyingElement);

    flyingElement.getBoundingClientRect();

    this.renderer.setStyle(flyingElement, 'left', `${cartRect.left + cartRect.width / 2 - 15}px`);
    this.renderer.setStyle(flyingElement, 'top', `${cartRect.top + cartRect.height / 2 - 15}px`);
    this.renderer.setStyle(flyingElement, 'opacity', '0');
    this.renderer.setStyle(flyingElement, 'transform', 'scale(0.9)');
    this.renderer.setStyle(flyingElement, 'transition', 'all 0.9s cubic-bezier(0.3, 0, 0, 1)');

    flyingElement.addEventListener('transitionend', () => {
      this.renderer.removeChild(document.body, flyingElement);
    }, { once: true });
  }

  get mainImage(): string {
    return this.product.images?.[0] || 'assets/default-product-image.png';
  }
}