import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Input } from '@angular/core';
import { Product } from '../services/product.service';
import { CommonModule } from '@angular/common';
import { CardComponent } from '../card/card.component';
import { RatingService, TopRatedProduct } from '../services/rating.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-top-rated-products',
  imports: [CommonModule, CardComponent],
  templateUrl: './top-rated-products.component.html',
  styleUrl: './top-rated-products.component.css'
})
export class TopRatedProductsComponent implements OnInit, OnDestroy {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  @Input() maxProducts: number = 20;
  @Input() minRating: number = 4.0;
  @Input() minRatingCount: number = 5;

  topRatedProducts: Product[] = [];
  isLoading = false;
  canScrollLeft = false;
  canScrollRight = false;
  error: string | null = null;

  private subscriptions = new Subscription();

  constructor(private ratingService: RatingService) {}

  ngOnInit(): void {
    this.loadTopRatedProducts();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadTopRatedProducts(): void {
  this.isLoading = true;
  this.error = null;

  this.subscriptions.add(
    this.ratingService.getTopRatedProducts().subscribe({
      next: (products: TopRatedProduct[]) => {
        this.topRatedProducts = products.map(product => ({
          ...product,
          discountedPrice: product.discountedPrice || product.price,
          discountPercentage: product.discountPercentage || 0,
          quantity: product.quantity || 0,
          warranty: product.warranty || '',
          rating: product.averageRating,
          userRating: 0,
          averageRating: product.averageRating
        } as Product));

        this.isLoading = false;
        setTimeout(() => this.updateScrollButtons(), 100);
      },
      error: (error) => {
        this.error = 'Failed to load top rated products';
        this.isLoading = false;
        this.topRatedProducts = [];
      }
    })
  );
}

  scrollLeft(): void {
    if (this.scrollContainer) {
      const container = this.scrollContainer.nativeElement;
      const scrollAmount = 300;
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  }

  scrollRight(): void {
    if (this.scrollContainer) {
      const container = this.scrollContainer.nativeElement;
      const scrollAmount = 300;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  onScroll(): void {
    this.updateScrollButtons();
  }

  private updateScrollButtons(): void {
    if (!this.scrollContainer) return;

    const container = this.scrollContainer.nativeElement;
    const { scrollLeft, scrollWidth, clientWidth } = container;

    this.canScrollLeft = scrollLeft > 0;
    this.canScrollRight = scrollLeft < (scrollWidth - clientWidth - 1);
  }

  onRatingChanged(updatedProduct: Product): void {
    const index = this.topRatedProducts.findIndex(p => p.id === updatedProduct.id);
    if (index !== -1) {
      this.topRatedProducts[index] = { ...updatedProduct };
    }
  }

  refresh(): void {
    this.loadTopRatedProducts();
  }
}