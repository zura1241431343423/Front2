import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Input } from '@angular/core';
import { Product } from '../services/product.service';
import { CommonModule } from '@angular/common';
import { CardComponent } from '../card/card.component';
import { ProductService } from '../services/product.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-newly-added-products',
  imports: [CommonModule, CardComponent],
  templateUrl: './newly-added-products.component.html',
  styleUrl: './newly-added-products.component.css'
})
export class NewlyAddedProductsComponent implements OnInit, OnDestroy {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  @Input() maxProducts: number = 20;
  @Input() daysBack: number = 30;
  
  newlyAddedProducts: Product[] = [];
  isLoading = false;
  canScrollLeft = false;
  canScrollRight = false;
  error: string | null = null;
  
  private subscriptions = new Subscription();
  
  constructor(private productService: ProductService) {}
  
  ngOnInit(): void {
    this.loadNewlyAddedProducts();
  }
  
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  
  private loadNewlyAddedProducts(): void {
    this.isLoading = true;
    this.error = null;
    
    this.subscriptions.add(
      this.productService.getNewlyAddedProducts(this.maxProducts, this.daysBack).subscribe({
        next: (products: Product[]) => {
          this.newlyAddedProducts = products.map(product => ({
            ...product,
            discountedPrice: product.discountedPrice || product.price,
            discountPercentage: product.discountPercentage || 0,
            quantity: product.quantity || 0,
            warranty: product.warranty || 0,
            rating: product.averageRating || 0,
            userRating: 0,
            averageRating: product.averageRating || 0,
            images: product.images || [],
            
            ratingCount: product.ratingCount || 0
          } as Product));
          
          this.isLoading = false;
          setTimeout(() => this.updateScrollButtons(), 100);
        },
        error: (error) => {
          this.error = 'Failed to load newly added products';
          this.isLoading = false;
          this.newlyAddedProducts = [];
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
    const index = this.newlyAddedProducts.findIndex(p => p.id === updatedProduct.id);
    if (index !== -1) {
      this.newlyAddedProducts[index] = { ...updatedProduct };
    }
  }
  
  refresh(): void {
    this.loadNewlyAddedProducts();
  }
}