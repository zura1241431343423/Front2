import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { CurrencyService } from '../services/currency-service.service';
import { Product } from '../services/product.service';
import { CardComponent } from '../card/card.component';

@Component({
  selector: 'app-search-result',
  standalone: true,
  imports: [CommonModule, CardComponent],
  templateUrl: './search-result.component.html',
  styleUrls: ['./search-result.component.css']
})
export class SearchResultComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private currencyService = inject(CurrencyService);

  searchQuery: string = '';
  searchResults: Product[] = [];
  isLoading: boolean = false;
  hasSearched: boolean = false;
  currentCurrency: any;
  
  private destroy$ = new Subject<void>();
  private apiUrl = 'https://localhost:7233/api';

  ngOnInit() {

    this.currentCurrency = this.currencyService.getCurrentCurrency();

    this.currencyService.currentCurrency$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(currency => {
      this.currentCurrency = currency;
    });


    this.route.queryParams.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const query = params['q'];
      if (query && query.trim()) {
        this.searchQuery = query.trim();
        this.performSearch(this.searchQuery);
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  performSearch(query: string) {
    if (!query || query.trim().length === 0) {
      return;
    }

    this.isLoading = true;
    this.hasSearched = true;
    
    const url = `${this.apiUrl}/Search?query=${encodeURIComponent(query)}`;
    console.log('Making search API call to:', url);

    this.http.get<Product[]>(url).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Search API Error:', error);
        return of([]);
      })
    ).subscribe({
      next: (products) => {
        this.searchResults = products;
        this.isLoading = false;
        console.log('Search results:', products);
      },
      error: (error) => {
        console.error('Search error:', error);
        this.searchResults = [];
        this.isLoading = false;
      }
    });
  }

  onProductClick(product: Product) {
    console.log('Product clicked:', product);
    this.router.navigate(['/product', product.id]);
  }

  onProductRatingChanged(product: Product) {

    console.log('Product rating changed:', product);

    const index = this.searchResults.findIndex(p => p.id === product.id);
    if (index !== -1) {
      this.searchResults[index] = product;
    }
  }

  formatPrice(price: number): string {
    if (price === null || price === undefined || isNaN(price)) {
      return this.currencyService.formatCurrentCurrency(0);
    }

    const convertedPrice = this.currencyService.convertPrice(price, this.currentCurrency.code);
    return this.currencyService.formatCurrentCurrency(convertedPrice);
  }

  onNewSearch(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    if (query && query.trim()) {
      this.router.navigate(['/search'], { queryParams: { q: query.trim() } });
    }
  }

  onSearchKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      const query = (event.target as HTMLInputElement).value;
      if (query && query.trim()) {
        this.router.navigate(['/search'], { queryParams: { q: query.trim() } });
      }
    }
  }
}