import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../services/product.service';
import { Subscription } from 'rxjs';
import { CardComponent } from '../card/card.component';
import { CartService } from '../services/cart.service'; // Updated

@Component({
  selector: 'app-popular-products',
  imports: [CommonModule, CardComponent],
  templateUrl: './popular-products.component.html',
  styleUrl: './popular-products.component.css',
  standalone: true
})
export class PopularProductsComponent implements OnInit, OnDestroy {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  @Input() maxProducts: number = 20;

  popularProducts: Product[] = [];
  isLoading = false;
  canScrollLeft = false;
  canScrollRight = false;

  private subscriptions = new Subscription();

  constructor(private cartService: CartService) {}

  ngOnInit(): void {
    this.loadPopularProducts();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadPopularProducts(): void {
    this.isLoading = true;

    this.subscriptions.add(
      this.cartService.getMostPopularProducts(this.maxProducts).subscribe({
        next: (products: any[]) => {
         
          this.popularProducts = products.map(p => p.product);
          this.isLoading = false;
          setTimeout(() => this.updateScrollButtons(), 100);
        },
        error: (error) => {
          console.error('Error loading popular products:', error);
          this.isLoading = false;
          this.popularProducts = [];
        }
      })
    );
  }

  scrollLeft(): void {
    const container = this.scrollContainer?.nativeElement;
    if (container) container.scrollBy({ left: -300, behavior: 'smooth' });
  }

  scrollRight(): void {
    const container = this.scrollContainer?.nativeElement;
    if (container) container.scrollBy({ left: 300, behavior: 'smooth' });
  }

  onScroll(): void {
    this.updateScrollButtons();
  }

  private updateScrollButtons(): void {
    const container = this.scrollContainer?.nativeElement;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    this.canScrollLeft = scrollLeft > 0;
    this.canScrollRight = scrollLeft < (scrollWidth - clientWidth - 1);
  }

  onRatingChanged(updatedProduct: Product): void {
    const index = this.popularProducts.findIndex(p => p.id === updatedProduct.id);
    if (index !== -1) {
      this.popularProducts[index] = { ...updatedProduct };
    }
  }

  refresh(): void {
    this.loadPopularProducts();
  }
}
