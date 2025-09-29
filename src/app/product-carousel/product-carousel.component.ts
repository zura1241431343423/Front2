
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProductService, Product } from '../services/product.service';
import { CurrencyService, Currency } from '../services/currency-service.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-product-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-carousel.component.html',
  styleUrls: ['./product-carousel.component.css']
})
export class ProductCarouselComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  discountedProducts: Product[] = [];
  currentIndex = 0;
  autoSlideInterval?: Subscription;
  private subscriptions = new Subscription();

  currentCurrency: Currency = { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1.0 };
  private currencySubscription?: Subscription;

  constructor(
    private productService: ProductService,
    private currencyService: CurrencyService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDiscountedProducts();
    this.startAutoSlide();

    this.currencySubscription = this.currencyService.currentCurrency$.subscribe(currency => {
      this.currentCurrency = currency;
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.stopAutoSlide();
    this.currencySubscription?.unsubscribe();
  }

  loadDiscountedProducts(): void {
    const sub = this.productService.getAllProducts().subscribe({
      next: (products) => {
        this.discountedProducts = products.filter(product => this.hasActiveDiscount(product));
        this.products = this.discountedProducts;

        if (this.products.length === 0 || this.currentIndex >= this.products.length) {
          this.currentIndex = 0;
        }
      },
      error: (error) => {
        console.error('Error loading discounted products:', error);
        this.products = [];
        this.discountedProducts = [];
      }
    });
    this.subscriptions.add(sub);
  }

  goToProductProfile(productId: number): void {
    this.router.navigate(['/product', productId]);
  }

  hasActiveDiscount(product: Product): boolean {
    return product.discountPercentage !== null &&
           product.discountPercentage !== undefined &&
           product.discountPercentage > 0;
  }

  getCurrentSlideUrl(): string {
    if (this.products.length === 0) return '';
    const currentProduct = this.products[this.currentIndex];
    return currentProduct?.images?.[0]
      ? `url(${currentProduct.images[0]})`
      : 'url(/assets/images/placeholder.jpg)';
  }

  getCurrentProduct(): Product | null {
    return this.products.length ? this.products[this.currentIndex] : null;
  }

  goToNext(): void {
    if (!this.products.length) return;
    this.currentIndex = (this.currentIndex + 1) % this.products.length;
    this.restartAutoSlide();
  }

  goToPrevious(): void {
    if (!this.products.length) return;
    this.currentIndex = this.currentIndex === 0
      ? this.products.length - 1
      : this.currentIndex - 1;
    this.restartAutoSlide();
  }

  goToSlide(index: number): void {
    if (index >= 0 && index < this.products.length) {
      this.currentIndex = index;
      this.restartAutoSlide();
    }
  }

  startAutoSlide(): void {
    this.autoSlideInterval = interval(5000).subscribe(() => {
      if (this.products.length > 1) this.goToNext();
    });
  }

  stopAutoSlide(): void {
    this.autoSlideInterval?.unsubscribe();
  }

  restartAutoSlide(): void {
    this.stopAutoSlide();
    this.startAutoSlide();
  }

  getOriginalPrice(product: Product): number {
    return product.price;
  }

  getDiscountedPrice(product: Product): number {
    if (product.discountPercentage) {
      return product.price - (product.price * product.discountPercentage / 100);
    }
    return product.price;
  }

  getFormattedOriginalPrice(product: Product): string {
    const price = this.getOriginalPrice(product) * this.currentCurrency.rate;
    return this.currencyService.formatCurrentCurrency(price);
  }

  getFormattedDiscountedPrice(product: Product): string {
    const price = this.getDiscountedPrice(product) * this.currentCurrency.rate;
    return this.currencyService.formatCurrentCurrency(price);
  }

  getDiscountPercentage(product: Product): number {
    return product.discountPercentage || 0;
  }

  getSavingsAmount(product: Product): string {
    const savings = (this.getOriginalPrice(product) - this.getDiscountedPrice(product)) * this.currentCurrency.rate;
    return this.currencyService.formatCurrentCurrency(savings);
  }

  refreshCarousel(): void {
    this.loadDiscountedProducts();
  }
}
