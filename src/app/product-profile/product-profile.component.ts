import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  Renderer2,
  ViewChild,
  ElementRef
} from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { UserService } from '../services/user.service';
import { ProductService, Product } from '../services/product.service';
import { RatingService } from '../services/rating.service';
import { CartService, CartItem } from '../services/cart.service';
import { CurrencyService, Currency } from '../services/currency-service.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UserReviewComponent } from '../user-review/user-review.component';

@Component({
  selector: 'app-product-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, UserReviewComponent],
  templateUrl: './product-profile.component.html',
  styleUrls: ['./product-profile.component.css']
})
export class ProductProfileComponent implements OnInit, OnDestroy, AfterViewInit {
  product: Product | null = null;
  reviews: any[] = [];
  averageRating = 0;
  totalReviews = 0;
  currentSlide: number = 0;

  
  currentCurrency: Currency = { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1.0 };
  convertedPrice = 0;
  convertedOriginalPrice = 0;
  convertedDiscountedPrice = 0;
  private currencySubscription?: Subscription;

  newReview = {
    name: '',
    comment: '',
    rating: 0
  };

  setCurrentImage(index: number): void {
    this.currentSlide = index;
  }

  ratingCount = 0;
  stars = Array(5).fill(0);
  hoveredRating = 0;
  newReviewHoverRating = 0;
  localUserRating: number | null = null;

  isLoading = false;
  errorMessage = '';

  private ratingSubscription?: Subscription;

  
  currentImageIndex = 0;
  @ViewChild('carouselImages') carouselImagesRef!: ElementRef;
  @ViewChild('carouselDots') carouselDotsRef!: ElementRef;

  get displayRating(): number {
    return this.hoveredRating || this.localUserRating || this.averageRating;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private userService: UserService,
    private productService: ProductService,
    private cartService: CartService,
    private ratingService: RatingService,
    private currencyService: CurrencyService,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    const productId = this.route.snapshot.paramMap.get('id');
    if (productId && !isNaN(+productId)) {
      this.loadProduct(+productId);
      this.loadReviews(productId);
      this.loadUserRating(+productId);
      this.subscribeToRatingChanges(+productId);
    } else {
      this.errorMessage = 'Invalid product ID';
    }

    const user = this.userService.getCurrentUser();
    if (user) {
      this.newReview.name = user.name || user.email || '';
    }

    this.subscribeToCurrencyChanges();
  }

  private subscribeToCurrencyChanges(): void {
    this.currencySubscription = this.currencyService.currentCurrency$.subscribe(
      currency => {
        this.currentCurrency = currency;
        this.updateConvertedPrices();
      }
    );
    this.currentCurrency = this.currencyService.getCurrentCurrency();
    this.updateConvertedPrices();
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
    return !!(this.product?.discountedPrice && 
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
    return this.product?.discountPercentage || 0;
  }

  ngAfterViewInit(): void {
    this.setupCarouselListeners();
  }

  ngOnDestroy(): void {
    if (this.ratingSubscription) {
      this.ratingSubscription.unsubscribe();
    }
    if (this.currencySubscription) {
      this.currencySubscription.unsubscribe();
    }
  }

  private setupCarouselListeners(): void {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const dots = Array.from(document.querySelectorAll('.carousel-dots .dot'));

    if (prevBtn) {
      this.renderer.listen(prevBtn, 'click', () => this.prevImage());
    }

    if (nextBtn) {
      this.renderer.listen(nextBtn, 'click', () => this.nextImage());
    }

    dots.forEach((dot, index) => {
      this.renderer.listen(dot, 'click', () => this.goToImage(index));
    });
  }

  private updateCarousel(): void {
    const carouselImages = document.getElementById('carouselImages');
    const dots = document.querySelectorAll('.carousel-dots .dot');

    if (carouselImages && this.product) {
      const translateX = -this.currentImageIndex * 100;
      (carouselImages as HTMLElement).style.transform = `translateX(${translateX}%)`;
    }

    dots.forEach((dot, i) => {
      if (i === this.currentImageIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  nextImage(): void {
    if (!this.product?.images) return;
    this.currentImageIndex = (this.currentImageIndex + 1) % this.product.images.length;
    this.updateCarousel();
  }

  prevImage(): void {
    if (!this.product?.images) return;
    this.currentImageIndex =
      (this.currentImageIndex - 1 + this.product.images.length) % this.product.images.length;
    this.updateCarousel();
  }

  goToImage(index: number): void {
    this.currentImageIndex = index;
    this.updateCarousel();
  }

  private subscribeToRatingChanges(productId: number): void {
    this.ratingSubscription = this.ratingService.ratingState$.subscribe(update => {
      if (update && update.productId === productId) {
        this.averageRating = update.averageRating;
        this.ratingCount = update.ratingCount;
        this.localUserRating = update.userRating;

        if (this.product) {
          this.product.averageRating = update.averageRating;
          this.product.ratingCount = update.ratingCount;
        }
      }
    });
  }

  private loadUserRating(productId: number): void {
    if (!this.userService.isLoggedIn()) return;

    this.ratingService.getUserRatingForProduct(productId).subscribe({
      next: rating => {
        this.localUserRating = rating;
      },
      error: error => {
        this.localUserRating = null;
      }
    });
  }

  loadProduct(id: number): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.productService.getProductById(id).subscribe({
      next: product => {
        this.product = product;
        this.averageRating = product.averageRating || product.rating || 0;
        this.ratingCount = product.ratingCount || 0;
        this.isLoading = false;
        this.updateConvertedPrices();
        setTimeout(() => this.updateCarousel(), 100);
      },
      error: error => {
        this.errorMessage = error.message || 'Failed to load product';
        this.isLoading = false;
        if (error.message?.includes('not found')) {
          setTimeout(() => this.router.navigate(['/products']), 3000);
        }
      }
    });
  }

  onAddToBasketClick(event: MouseEvent): void {
    event.stopPropagation();

    if (!this.product) return; 

    
    const price = this.hasDiscount() ? this.product.discountedPrice! : this.product.price;
    const convertedPrice = price * this.currentCurrency.rate;

    const cartItem: CartItem & { quantityAvailable: number } = {
      id: this.product.id,
      name: this.product.name,
      price: convertedPrice,
      quantity: 1,
      image: this.product.images?.[0] ?? '',
      quantityAvailable: this.product.quantity
    };

    const existing = this.cartService.getCartItems().find(p => p.id === cartItem.id);
    if (existing && existing.quantity >= cartItem.quantityAvailable) {
      console.log(`Cannot add more than available stock (${cartItem.quantityAvailable})`);
      return;
    }

    this.cartService.addToCart(cartItem);
  }

  loadReviews(productId: string): void {
    this.http.get<any[]>(`https://localhost:7233/api/comment?productId=${productId}`).subscribe({
      next: reviews => {
        this.reviews = Array.isArray(reviews) ? reviews : [];
        this.totalReviews = this.reviews.length;
        if (!this.product) {
          this.averageRating = this.calculateAverageRating(this.reviews);
        }
      },
      error: error => {
        this.reviews = [];
        this.totalReviews = 0;
        if (!this.product) {
          this.averageRating = 0;
        }
      }
    });
  }

  calculateAverageRating(reviews: any[]): number {
    if (!reviews.length) return 0;
    const total = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
    return total / reviews.length;
  }

  isStarActive(index: number): boolean {
    const starNumber = index + 1;
    if (this.hoveredRating > 0) return starNumber <= this.hoveredRating;
    if (this.localUserRating !== null && this.localUserRating > 0)
      return starNumber <= this.localUserRating;
    return starNumber <= Math.round(this.averageRating);
  }

  

setRating(rating: number): void {
  if (this.isLoading || !this.product) return;

  
  if (!this.userService.isLoggedIn()) {
    this.errorMessage = 'Please login to rate products';
    return;
  }

  this.isLoading = true;
  this.errorMessage = ''; 

  
  this.ratingService.submitRating(this.product.id, rating).subscribe({
    next: response => {
      console.log('Rating submitted successfully:', response);
      this.localUserRating = response.value;

    
      this.ratingService.getProductAverageRating(this.product!.id).subscribe(avgData => {
        this.averageRating = avgData.averageRating;
        this.ratingCount = avgData.ratingCount;

        if (this.product) {
          this.product.averageRating = avgData.averageRating;
          this.product.ratingCount = avgData.ratingCount;
        }

        this.isLoading = false;
      });
    },
    error: err => {
      console.error('Rating submission error:', err);
      this.isLoading = false;
      
      
      if (err.status === 401) {
        this.errorMessage = 'Please login to rate products';
      } else if (err.status === 400) {
        this.errorMessage = err.error?.message || 'Failed to submit rating';
      } else {
        this.errorMessage = 'Failed to submit rating. Please try again.';
      }
    }
  });
}

  onStarHover(rating: number): void {
    if (!this.isLoading) this.hoveredRating = rating;
  }

  onStarLeave(): void {
    if (!this.isLoading) this.hoveredRating = 0;
  }

  submitReview(): void {
    if (!this.userService.isLoggedIn()) {
      alert('You must be logged in to leave a review.');
      return;
    }

    if (!this.product?.id) {
      alert('Product not found.');
      return;
    }

    if (
      !this.newReview.name.trim() ||
      !this.newReview.comment.trim() ||
      this.newReview.rating === 0
    ) {
      alert('Please fill in all fields and provide a rating.');
      return;
    }

    const currentUser = this.userService.getCurrentUser();
    if (!currentUser?.id) {
      alert('User information not found. Please log in again.');
      return;
    }

    const payload = {
      userId: currentUser.id,
      productId: this.product.id,
      name: this.newReview.name.trim(),
      comment: this.newReview.comment.trim(),
      rating: this.newReview.rating,
      date: new Date().toISOString()
    };

    this.http.post('https://localhost:7233/api/comment', payload).subscribe({
      next: () => {
        this.newReview.comment = '';
        this.newReview.rating = 0;
        this.newReviewHoverRating = 0;
        this.loadReviews(this.product!.id.toString());
        alert('Review submitted successfully!');
      },
      error: () => {
        alert('Failed to submit review. Please try again.');
      }
    });
  }

  getInitials(name: string): string {
    return name
      ? name
          .trim()
          .split(' ')
          .map(part => part.charAt(0).toUpperCase())
          .join('')
          .slice(0, 2)
      : '??';
  }

  goBack(): void {
    window.history.back();
  }

  onReviewAdded(review: any): void {
    console.log('Review added:', review);
  }
}