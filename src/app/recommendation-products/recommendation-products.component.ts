import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../services/product.service';
import { Subscription } from 'rxjs';
import { CardComponent } from '../card/card.component';
import { RecommendationService } from '../services/recommendation.service';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-recommendation-products',
  imports: [CommonModule, CardComponent],
  templateUrl: './recommendation-products.component.html',
  styleUrl: './recommendation-products.component.css',
  standalone: true
})
export class RecommendationProductsComponent implements OnInit, OnDestroy {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLElement>;
  @Input() maxProducts: number = 20;

  recommendedProducts: Product[] = [];
  isLoading: boolean = false;
  canScrollLeft: boolean = false;
  canScrollRight: boolean = false;
  private subscriptions: Subscription = new Subscription();

  constructor(
    private recommendationService: RecommendationService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.userService.getCurrentUserDetails().subscribe(user => {
        if (user) {
          this.loadRecommendedProducts();
        }
      })
    );

    this.subscriptions.add(
      this.recommendationService.isLoading$.subscribe(loading => {
        this.isLoading = loading;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadRecommendedProducts(): void {
    this.isLoading = true;
    this.subscriptions.add(
      this.recommendationService.getPersonalizedRecommendations(this.maxProducts).subscribe({
        next: (products: Product[]) => {
          this.recommendedProducts = products;
          this.updateScrollButtonsWithDelay();
        },
        error: (error: any) => {
          console.error('Error loading recommendations:', error);
          this.recommendedProducts = [];
          this.isLoading = false;
        }
      })
    );
  }

  private updateScrollButtonsWithDelay(): void {
    setTimeout(() => {
      this.updateScrollButtons();
      this.isLoading = false;
    }, 100);
  }

  scrollLeft(): void {
    const container = this.scrollContainer?.nativeElement;
    if (container) {
      container.scrollBy({ left: -300, behavior: 'smooth' });
    }
  }

  scrollRight(): void {
    const container = this.scrollContainer?.nativeElement;
    if (container) {
      container.scrollBy({ left: 300, behavior: 'smooth' });
    }
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
    const index = this.recommendedProducts.findIndex(p => p.id === updatedProduct.id);
    if (index !== -1) {
      this.recommendedProducts[index] = { ...updatedProduct };
    }
  }

  refresh(): void {
    this.loadRecommendedProducts();
  }
}