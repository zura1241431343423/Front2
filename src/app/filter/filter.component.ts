
import { Component, Output, EventEmitter, OnInit, OnDestroy, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CurrencyService } from '../services/currency-service.service';
import { ProductService, Product } from '../services/product.service';
import { Subscription } from 'rxjs';

interface Currency {
  code: string;
  name: string;
  symbol: string;
  rate: number;
}

export interface PriceFilterEvent {
  min: number | null;
  max: number | null;
  currencyCode: string;
  
  minUSD: number | null;
  maxUSD: number | null;
}

export interface BrandFilterEvent {
  selectedBrands: string[];
}

export interface FilterEvent {
  priceFilter: PriceFilterEvent;
  brandFilter: BrandFilterEvent;
}

@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.css']
})
export class FilterComponent implements OnInit, OnDestroy, OnChanges {
  minPrice: number | null = null;
  maxPrice: number | null = null;
  currentCurrency: Currency;
  
  availableBrands: string[] = [];
  selectedBrands: Set<string> = new Set();
  

  isLoadingBrands: boolean = false;
  
  private currencySubscription: Subscription;
  private productsSubscription: Subscription;

  @Input() products: Product[] = []; 
  @Input() resetFiltersOnProductsChange: boolean = true;
  @Input() currentCategory: string = ''; 
  @Output() priceFilterChanged = new EventEmitter<PriceFilterEvent>();
  @Output() brandFilterChanged = new EventEmitter<BrandFilterEvent>();
  @Output() filtersChanged = new EventEmitter<FilterEvent>(); 

 
  private lastProcessedCategory: string = '';

  constructor(
    private currencyService: CurrencyService,
    private productService: ProductService
  ) {
    this.currentCurrency = this.currencyService.getCurrentCurrency();
    this.currencySubscription = new Subscription();
    this.productsSubscription = new Subscription();
  }

  ngOnInit(): void {
    this.currencySubscription = this.currencyService.currentCurrency$.subscribe(currency => {
      const previousCurrency = this.currentCurrency;
      this.currentCurrency = currency;

      
      if (previousCurrency.code !== currency.code) {
        if (this.minPrice !== null) {
          this.minPrice = Math.round(this.currencyService.convertBetweenCurrencies(
            this.minPrice,
            previousCurrency.code,
            currency.code
          ) * 100) / 100;
        }
        if (this.maxPrice !== null) {
          this.maxPrice = Math.round(this.currencyService.convertBetweenCurrencies(
            this.maxPrice,
            previousCurrency.code,
            currency.code
          ) * 100) / 100;
        }
      }

      this.emitFiltersChange();
    });

   
    this.initializeBrands();
  }

  ngOnChanges(changes: SimpleChanges): void {
    let shouldReinitializeBrands = false;

   
    if (changes['currentCategory']) {
      const newCategory = changes['currentCategory'].currentValue || '';
      const oldCategory = changes['currentCategory'].previousValue || '';
      
  
      if (newCategory !== oldCategory) {
        console.log('Category changed from', oldCategory, 'to', newCategory);
        this.handleCategoryChange(newCategory);
        this.lastProcessedCategory = newCategory;
        return; 
      }
    }
    
    
    if (changes['products'] && !changes['products'].firstChange) {
      const currentCategory = this.currentCategory || '';
      
      
      if (currentCategory === this.lastProcessedCategory) {
        console.log('Products changed for same category:', currentCategory);
        this.handleProductsChange();
      }
    }
  }

  ngOnDestroy(): void {
    this.currencySubscription.unsubscribe();
    this.productsSubscription.unsubscribe();
  }

  onPriceChange(): void {
    this.emitFiltersChange();
  }

  onBrandChange(brand: string, isChecked: boolean): void {
    if (isChecked) {
      this.selectedBrands.add(brand);
    } else {
      this.selectedBrands.delete(brand);
    }
    this.emitFiltersChange();
  }

  isBrandSelected(brand: string): boolean {
    return this.selectedBrands.has(brand);
  }

  clearAllBrands(): void {
    this.selectedBrands.clear();
    this.emitFiltersChange();
  }

  selectAllBrands(): void {
    this.availableBrands.forEach(brand => this.selectedBrands.add(brand));
    this.emitFiltersChange();
  }

  getCurrencySymbol(): string {
    return this.currentCurrency.symbol;
  }

  private initializeBrands(): void {
    const category = this.currentCategory || '';
    console.log('Initializing brands for category:', category);
    
  
    if (category.trim()) {
      this.loadBrandsForCategory(category);
    } else if (this.products && this.products.length > 0) {
      this.extractBrandsFromProducts(this.products);
    } else {
      this.loadAvailableBrands();
    }
    
    this.lastProcessedCategory = category;
  }

  private handleProductsChange(): void {
    console.log('Handling products change, current category:', this.currentCategory);
    
    
    if (!this.currentCategory || this.currentCategory.trim() === '') {
      console.log('No category specified, extracting brands from products');
      this.availableBrands = [];
      this.selectedBrands.clear();
      
      if (this.products && this.products.length > 0) {
        this.extractBrandsFromProducts(this.products);
      }
      
      this.emitFiltersChange();
    }
  }

  private handleCategoryChange(newCategory: string): void {
    console.log('Handling category change to:', newCategory);
    
    
    this.availableBrands = [];
    this.selectedBrands.clear();
    this.isLoadingBrands = true;
    
    if (this.productsSubscription) {
      this.productsSubscription.unsubscribe();
      this.productsSubscription = new Subscription();
    }
    
  
    if (newCategory && newCategory.trim()) {
      this.loadBrandsForCategory(newCategory);
    } else if (this.products && this.products.length > 0) {
      this.extractBrandsFromProducts(this.products);
      this.isLoadingBrands = false;
    } else {
      this.isLoadingBrands = false;
    }
    
    
    this.emitFiltersChange();
  }

  private loadBrandsForCategory(category: string): void {
    console.log('Loading brands for category:', category);
    this.isLoadingBrands = true;
    
   
    if (this.productsSubscription) {
      this.productsSubscription.unsubscribe();
    }
    
    this.productsSubscription = this.productService.getBrandsByCategory(category).subscribe({
      next: (brands) => {
        console.log('Received brands for category', category, ':', brands);
        
      
        if (category === this.currentCategory) {
          this.availableBrands = brands.sort((a, b) => 
            a.toLowerCase().localeCompare(b.toLowerCase())
          );
          this.isLoadingBrands = false;
        } else {
          console.log('Category changed while loading brands, ignoring results');
        }
      },
      error: (error) => {
        console.error('Error loading brands for category:', error);
        
  
        if (category === this.currentCategory) {
          this.availableBrands = [];
          this.isLoadingBrands = false;
          

          if (this.products && this.products.length > 0) {
            console.log('Falling back to extracting brands from products');
            this.extractBrandsFromProducts(this.products);
          }
        }
      }
    });
  }

  private loadAvailableBrands(): void {
    console.log('Loading all available brands');
    this.isLoadingBrands = true;
    
    
    if (this.productsSubscription) {
      this.productsSubscription.unsubscribe();
    }
    
    this.productsSubscription = this.productService.getAllProducts().subscribe({
      next: (products) => {
        this.extractBrandsFromProducts(products);
        this.isLoadingBrands = false;
      },
      error: (error) => {
        console.error('Error loading products for brand filter:', error);
        this.availableBrands = [];
        this.isLoadingBrands = false;
      }
    });
  }

  private extractBrandsFromProducts(products: Product[]): void {
    console.log('Extracting brands from', products.length, 'products');
    const brandsSet = new Set<string>();
    
    products.forEach(product => {
      if (product.brand && product.brand.trim()) {
        const normalizedBrand = product.brand.trim();
        brandsSet.add(normalizedBrand);
      }
    });


    this.availableBrands = Array.from(brandsSet).sort((a, b) => 
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
    
    console.log('Extracted brands:', this.availableBrands);
  }

  private emitPriceChange(): void {
    const minUSD = this.minPrice !== null ?
      Math.round(this.currencyService.convertBetweenCurrencies(this.minPrice, this.currentCurrency.code, 'USD') * 100) / 100 :
      null;
      
    const maxUSD = this.maxPrice !== null ?
      Math.round(this.currencyService.convertBetweenCurrencies(this.maxPrice, this.currentCurrency.code, 'USD') * 100) / 100 :
      null;

    const priceFilter: PriceFilterEvent = {
      min: this.minPrice,
      max: this.maxPrice,
      currencyCode: this.currentCurrency.code,
      minUSD: minUSD,
      maxUSD: maxUSD
    };

    this.priceFilterChanged.emit(priceFilter);
  }

  private emitBrandChange(): void {
    const brandFilter: BrandFilterEvent = {
      selectedBrands: Array.from(this.selectedBrands)
    };

    this.brandFilterChanged.emit(brandFilter);
  }

  private emitFiltersChange(): void {

    this.emitPriceChange();
    this.emitBrandChange();

 
    const minUSD = this.minPrice !== null ?
      Math.round(this.currencyService.convertBetweenCurrencies(this.minPrice, this.currentCurrency.code, 'USD') * 100) / 100 :
      null;
      
    const maxUSD = this.maxPrice !== null ?
      Math.round(this.currencyService.convertBetweenCurrencies(this.maxPrice, this.currentCurrency.code, 'USD') * 100) / 100 :
      null;

    const combinedFilter: FilterEvent = {
      priceFilter: {
        min: this.minPrice,
        max: this.maxPrice,
        currencyCode: this.currentCurrency.code,
        minUSD: minUSD,
        maxUSD: maxUSD
      },
      brandFilter: {
        selectedBrands: Array.from(this.selectedBrands)
      }
    };

    this.filtersChanged.emit(combinedFilter);
  }

  resetFilters(): void {
    this.minPrice = null;
    this.maxPrice = null;
    this.selectedBrands.clear();
    this.emitFiltersChange();
  }

  resetBrandFilters(): void {
    this.selectedBrands.clear();
    this.emitFiltersChange();
  }

  trackByBrand(index: number, brand: string): string {
    return brand;
  }

 
  refreshBrands(): void {
    console.log('Manually refreshing brands for category:', this.currentCategory);
    if (this.currentCategory && this.currentCategory.trim()) {
      this.handleCategoryChange(this.currentCategory);
    }
  }
}