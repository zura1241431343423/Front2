import { Component, OnInit, OnDestroy, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, takeUntil } from 'rxjs/operators';
import { CurrencyService } from '../services/currency-service.service';
import { Product } from '../services/product.service';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.css']
})
export class SearchBarComponent implements OnInit, OnDestroy {
  @Output() productSelected = new EventEmitter<Product>();
  @Output() searchPerformed = new EventEmitter<string>();

  private http = inject(HttpClient);
  private router = inject(Router);
  private currencyService = inject(CurrencyService);

  searchQuery: string = '';
  filteredProducts: Product[] = [];
  showResults: boolean = false;
  isSearchFocused: boolean = false;
  isLoading: boolean = false;
  currentCurrency: any;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  private apiUrl = 'https://localhost:7233/api';

  ngOnInit() {
    
    this.currentCurrency = this.currencyService.getCurrentCurrency();
    
 
    this.currencyService.currentCurrency$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(currency => {
      this.currentCurrency = currency;
    });

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => this.performSearch(query)),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (products) => {
        this.filteredProducts = products;
        this.showResults = products.length > 0 || this.searchQuery.length > 0;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Search error:', error);
        this.filteredProducts = [];
        this.showResults = false;
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchInput(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery = query;

    if (query.length === 0) {
      this.filteredProducts = [];
      this.showResults = false;
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.searchSubject.next(query);
  }

  private performSearch(query: string) {
    if (query.length === 0) {
      return of([]);
    }

    const url = `${this.apiUrl}/Search?query=${encodeURIComponent(query)}&limit=6`;
    console.log('Making API call to:', url);

 
    return this.http.get<Product[]>(url).pipe(
      catchError(error => {
        console.error('API Error:', error);
        return of([]);
      })
    );
  }

 onSearchButtonClick() {
  if (this.searchQuery.trim()) {
    this.searchPerformed.emit(this.searchQuery.trim());
    this.router.navigate(['/search-result'], { queryParams: { q: this.searchQuery.trim() } });
    this.clearSearch();
  }
}

  onProductClick(product: Product) {
    console.log('Product clicked:', product);
    this.productSelected.emit(product);
  
    this.router.navigate(['/product', product.id]);
    this.clearSearch();
  }

  onSearchFocus() {
    this.isSearchFocused = true;
    if (this.searchQuery && this.filteredProducts.length > 0) {
      this.showResults = true;
    }
  }

  onSearchBlur() {
    setTimeout(() => {
      this.isSearchFocused = false;
      if (!this.searchQuery) {
        this.showResults = false;
      }
    }, 200);
  }

  clearSearch() {
    this.searchQuery = '';
    this.filteredProducts = [];
    this.showResults = false;
    this.isLoading = false;

    const inputElement = document.querySelector('.search-input') as HTMLInputElement;
    if (inputElement) {
      inputElement.value = '';
    }
  }

   formatPrice(price: number): string {
    if (price === null || price === undefined || isNaN(price)) {
      return this.currencyService.formatCurrentCurrency(0);
    }
    
   
    const convertedPrice = this.currencyService.convertPrice(price, this.currentCurrency.code);
    return this.currencyService.formatCurrentCurrency(convertedPrice);
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.onSearchButtonClick();
    } else if (event.key === 'Escape') {
      this.clearSearch();
    }
  }

 

  getProductImage(product: Product): string {
    if (!product.images || !Array.isArray(product.images) || product.images.length === 0) {
      return '/assets/placeholder-image.png';
    }
    const firstImage = product.images[0];
    if (!firstImage || firstImage.trim() === '') {
      return '/assets/placeholder-image.png';
    }
    return firstImage;
  }

  getProductName(product: Product): string {
    return product.name || 'Unknown Product';
  }
}