import { Component, OnInit, OnDestroy, ViewChild, HostListener } from '@angular/core';
import { ProductService, Product } from '../services/product.service';
import { CurrencyService } from '../services/currency-service.service';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CardComponent } from '../card/card.component';
import { FilterComponent, PriceFilterEvent, BrandFilterEvent, FilterEvent } from '../filter/filter.component';
import { FilterTopComponent, TopFilterEvent } from '../filter-top/filter-top.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-it-equipment',
  standalone: true,
  imports: [CommonModule, CardComponent, FilterComponent, FilterTopComponent],
  templateUrl: './it-equipment.component.html',
  styleUrls: ['./it-equipment.component.css']
})
export class ItEquipmentComponent implements OnInit, OnDestroy {
  @ViewChild(FilterTopComponent) filterTopComponent!: FilterTopComponent;
  @ViewChild(FilterComponent) filterComponent!: FilterComponent;
  
  products: Product[] = [];
  filteredProducts: Product[] = [];
  sortedProducts: Product[] = [];
  finalProducts: Product[] = [];
  currentProducts: Product[] = [];
  currentCategory: string = '';

  paginatedProducts: Product[] = [];
  currentPage: number = 1;
  productsPerPage: number = 15;
  totalPages: number = 0;
  visiblePages: number[] = [];
  
  isAnimating: boolean = false;
  showProducts: boolean = true;

  isLoading: boolean = true;
  error: string | null = null;

  readonly categoryName = 'IT Equipment';
  
  initialSubcategory: string = '';

  currentPriceFilter: PriceFilterEvent | null = null;
  currentBrandFilter: BrandFilterEvent | null = null;
  
  currentTopFilter: TopFilterEvent | null = null;
  
  showMobileFilter = false;
  private activeFiltersCount = 0;
  
  private currencySubscription: Subscription = new Subscription();
  private routeSubscription: Subscription = new Subscription();

  constructor(
    private productService: ProductService,
    private currencyService: CurrencyService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.currentCategory = this.categoryName;
    
    this.routeSubscription = this.route.queryParams.subscribe(params => {
      if (params['subcategory']) {
        this.initialSubcategory = params['subcategory'];
        if (this.filterTopComponent) {
          this.filterTopComponent.setSubcategory(params['subcategory']);
        }
      } else {
        this.initialSubcategory = '';
      }
    });

    this.loadProducts();

    this.currencySubscription = this.currencyService.currentCurrency$.subscribe(() => {
      this.applyAllFilters();
    });
  }

  ngOnDestroy(): void {
    this.currencySubscription.unsubscribe();
    this.routeSubscription.unsubscribe();
    document.body.classList.remove('filter-open');
  }

  toggleMobileFilter(): void {
    this.showMobileFilter = !this.showMobileFilter;
    this.toggleBodyScroll();
  }

  closeMobileFilter(): void {
    this.showMobileFilter = false;
    this.toggleBodyScroll();
  }

  private toggleBodyScroll(): void {
    if (this.showMobileFilter) {
      document.body.classList.add('filter-open');
    } else {
      document.body.classList.remove('filter-open');
    }
  }

  getActiveFiltersCount(): number {
    let count = 0;
    
    if (this.currentPriceFilter) {
      if (this.currentPriceFilter.minUSD !== null && this.currentPriceFilter.minUSD > 0) count++;
      if (this.currentPriceFilter.maxUSD !== null && this.currentPriceFilter.maxUSD > 0) count++;
    }
    
    if (this.currentBrandFilter && this.currentBrandFilter.selectedBrands) {
      count += this.currentBrandFilter.selectedBrands.length;
    }
    
    if (this.currentTopFilter) {
      if (this.currentTopFilter.sortBy && this.currentTopFilter.sortBy !== 'default') count++;
      if (this.currentTopFilter.subCategory && this.currentTopFilter.subCategory !== 'all') count++;
      if (this.currentTopFilter.minPrice !== undefined && this.currentTopFilter.minPrice !== null) count++;
      if (this.currentTopFilter.maxPrice !== undefined && this.currentTopFilter.maxPrice !== null) count++;
      if (this.currentTopFilter.minRating !== undefined && this.currentTopFilter.minRating !== null) count++;
    }
    
    this.activeFiltersCount = count;
    return count;
  }

  applyMobileFilters(): void {
    this.closeMobileFilter();
    this.getActiveFiltersCount();
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize(event: any): void {
    if (event.target.innerWidth > 1000 && this.showMobileFilter) {
      this.closeMobileFilter();
    }
  }

  loadProducts(): void {
    this.isLoading = true;
    this.error = null;

    this.productService.getProductsByCategory(this.categoryName).subscribe({
      next: (products) => {
        this.products = products;
        this.currentProducts = [...products];
        this.applyAllFilters();
        this.isLoading = false;
      },
      error: (error) => {
        this.error = `Failed to load ${this.categoryName} products. Please try again later.`;
        this.isLoading = false;
      }
    });
  }

  onTopFilterChange(topFilter: TopFilterEvent): void {
    this.currentTopFilter = topFilter;
    this.currentPage = 1;
    this.applyAllFilters();
    this.getActiveFiltersCount();
  }

  onSortedProducts(sortedProducts: Product[]): void {
    this.sortedProducts = sortedProducts;
    this.currentPage = 1;
    this.applyAllFilters();
  }

  loadProductsByCategory(category: string) {
    this.currentCategory = category;
    
    this.productService.getProductsByCategory(category).subscribe({
      next: (products) => {
        this.currentProducts = products;
        this.products = products;
        this.applyAllFilters();
      },
      error: (error) => {
        this.currentProducts = [];
        this.products = [];
      }
    });
  }

  onFiltersChanged(filterEvent: FilterEvent): void {
    this.currentPriceFilter = filterEvent.priceFilter;
    this.currentBrandFilter = filterEvent.brandFilter;
    this.currentPage = 1;
    this.applyAllFilters();
    this.getActiveFiltersCount();
  }

  handleFiltersChanged(filterEvent: FilterEvent): void {
    this.onFiltersChanged(filterEvent);
  }

  handlePriceFilterChanged(filterEvent: PriceFilterEvent): void {
    this.currentPriceFilter = filterEvent;
    this.currentPage = 1;
    this.applyAllFilters();
    this.getActiveFiltersCount();
  }

  handleBrandFilterChanged(filterEvent: BrandFilterEvent): void {
    this.currentBrandFilter = filterEvent;
    this.currentPage = 1;
    this.applyAllFilters();
    this.getActiveFiltersCount();
  }

  applyAllFilters(): void {
    let workingProducts = [...this.products];

    if (this.currentTopFilter) {
      workingProducts = this.applyTopFilters(workingProducts, this.currentTopFilter);
    }

    if (this.currentPriceFilter) {
      workingProducts = this.applyPriceFilter(workingProducts, this.currentPriceFilter);
    }

    if (this.currentBrandFilter) {
      workingProducts = this.applyBrandFilter(workingProducts, this.currentBrandFilter);
    }

    if (this.currentTopFilter && this.currentTopFilter.sortBy !== 'default') {
      workingProducts = this.applySorting(workingProducts, this.currentTopFilter.sortBy);
    }

    this.filteredProducts = workingProducts;
    this.finalProducts = workingProducts;
    
    this.updatePagination();
    
    this.getActiveFiltersCount();
  }

  private updatePagination(): void {
    this.totalPages = Math.ceil(this.finalProducts.length / this.productsPerPage);
    
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }

    const startIndex = (this.currentPage - 1) * this.productsPerPage;
    const endIndex = startIndex + this.productsPerPage;
    
    this.paginatedProducts = this.finalProducts.slice(startIndex, endIndex);
    
    this.updateVisiblePages();
  }

  private updateVisiblePages(): void {
    const maxVisiblePages = 5;
    this.visiblePages = [];

    if (this.totalPages <= maxVisiblePages) {
      for (let i = 1; i <= this.totalPages; i++) {
        this.visiblePages.push(i);
      }
    } else {
      let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
      
      if (endPage === this.totalPages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        this.visiblePages.push(i);
      }
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage && !this.isAnimating) {
      this.animatePageChange(() => {
        this.currentPage = page;
        this.updatePagination();
      });
    }
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1 && !this.isAnimating) {
      this.goToPage(this.currentPage - 1);
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages && !this.isAnimating) {
      this.goToPage(this.currentPage + 1);
    }
  }

  goToFirstPage(): void {
    if (!this.isAnimating) {
      this.goToPage(1);
    }
  }

  goToLastPage(): void {
    if (!this.isAnimating) {
      this.goToPage(this.totalPages);
    }
  }

  private animatePageChange(callback: () => void): void {
    this.isAnimating = true;
    this.showProducts = false;

    setTimeout(() => {
      callback();
      this.showProducts = true;
      
      setTimeout(() => {
        this.isAnimating = false;
      }, 400);
    }, 300);

    this.scrollToTop();
  }

  private scrollToTop(): void {
    const productsSection = document.querySelector('.products-section');
    if (productsSection) {
      productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  canGoPrevious(): boolean {
    return this.currentPage > 1 && !this.isAnimating;
  }

  canGoNext(): boolean {
    return this.currentPage < this.totalPages && !this.isAnimating;
  }

  getPaginationInfo(): string {
    if (this.finalProducts.length === 0) {
      return 'No products found';
    }
    
    const startItem = (this.currentPage - 1) * this.productsPerPage + 1;
    const endItem = Math.min(this.currentPage * this.productsPerPage, this.finalProducts.length);
    
    return `Showing ${startItem}-${endItem} of ${this.finalProducts.length} products`;
  }

  private applyTopFilters(products: Product[], topFilter: TopFilterEvent): Product[] {
    let filtered = [...products];

    filtered = filtered.filter(product => 
      product.category && 
      product.category.toLowerCase().trim() === this.categoryName.toLowerCase().trim()
    );

    if (topFilter.subCategory && topFilter.subCategory !== 'all') {
      const subCategoryToFilter = topFilter.subCategory.toLowerCase().trim();
      filtered = filtered.filter(product => 
        product.subCategory && 
        product.subCategory.toLowerCase().trim() === subCategoryToFilter
      );
    }

    if (topFilter.minPrice !== undefined && topFilter.minPrice !== null) {
      filtered = filtered.filter(product => product.price >= topFilter.minPrice!);
    }

    if (topFilter.maxPrice !== undefined && topFilter.maxPrice !== null) {
      filtered = filtered.filter(product => product.price <= topFilter.maxPrice!);
    }

    if (topFilter.minRating !== undefined && topFilter.minRating !== null) {
      filtered = filtered.filter(product => {
        const rating = product.averageRating || product.rating || 0;
        return rating >= topFilter.minRating!;
      });
    }

    return filtered;
  }

  private applyPriceFilter(products: Product[], priceFilter: PriceFilterEvent): Product[] {
    const { minUSD, maxUSD } = priceFilter;

    return products.filter(product => {
      const productPriceUSD = product.price;

      let passesMinFilter = true;
      let passesMaxFilter = true;

      if (minUSD !== null) {
        passesMinFilter = productPriceUSD >= minUSD;
      }

      if (maxUSD !== null) {
        passesMaxFilter = productPriceUSD <= maxUSD;
      }

      return passesMinFilter && passesMaxFilter;
    });
  }

  private applyBrandFilter(products: Product[], brandFilter: BrandFilterEvent): Product[] {
    if (!brandFilter.selectedBrands || brandFilter.selectedBrands.length === 0) {
      return products;
    }

    return products.filter(product => {
      if (!product.brand) return false;
      const productBrand = product.brand.trim();
      return brandFilter.selectedBrands.some(selectedBrand =>
        selectedBrand.trim().toLowerCase() === productBrand.toLowerCase()
      );
    });
  }

  private applySorting(products: Product[], sortBy: string): Product[] {
    const sorted = [...products];

    switch (sortBy) {
      case 'price-low':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price-high':
        return sorted.sort((a, b) => b.price - a.price);
      case 'name-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'rating-high':
        return sorted.sort((a, b) => {
          const ratingA = a.averageRating || a.rating || 0;
          const ratingB = b.averageRating || b.rating || 0;
          return ratingB - ratingA;
        });
      case 'rating-low':
        return sorted.sort((a, b) => {
          const ratingA = a.averageRating || a.rating || 0;
          const ratingB = b.averageRating || b.rating || 0;
          return ratingA - ratingB;
        });
      case 'newest':
        return sorted.sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
          return 0;
        });
      case 'oldest':
        return sorted.sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          }
          return 0;
        });
      default:
        return sorted;
    }
  }

  handleRatingChange(updatedProduct: Product): void {
    const index = this.products.findIndex(p => p.id === updatedProduct.id);
    if (index !== -1) {
      this.products[index] = updatedProduct;
      this.applyAllFilters();
    }
  }

  getDisplayPrice(productUSDPrice: number): string {
    const currentCurrency = this.currencyService.getCurrentCurrency();
    const convertedPrice = this.currencyService.convertBetweenCurrencies(
      productUSDPrice,
      'USD',
      currentCurrency.code
    );
    const roundedPrice = Math.round(convertedPrice * 100) / 100;
    return this.currencyService.formatCurrentCurrency(roundedPrice);
  }

  getFilteredProductsCount(): number {
    return this.finalProducts.length;
  }

  getTotalProductsCount(): number {
    return this.products.length;
  }

  hasActiveFilters(): boolean {
    const hasPriceFilter = !!(
      this.currentPriceFilter &&
      (this.currentPriceFilter.minUSD !== null || this.currentPriceFilter.maxUSD !== null)
    );

    const hasBrandFilter = !!(
      this.currentBrandFilter &&
      this.currentBrandFilter.selectedBrands.length > 0
    );

    const hasTopFilter = !!(
      this.currentTopFilter && (
        this.currentTopFilter.sortBy !== 'default' ||
        this.currentTopFilter.category !== 'all' ||
        this.currentTopFilter.subCategory !== 'all' ||
        this.currentTopFilter.minPrice !== undefined ||
        this.currentTopFilter.maxPrice !== undefined ||
        this.currentTopFilter.minRating !== undefined
      )
    );

    return hasPriceFilter || hasBrandFilter || hasTopFilter;
  }

  clearAllFilters(): void {
    this.currentPriceFilter = null;
    this.currentBrandFilter = null;
    this.currentTopFilter = null;
    this.currentPage = 1; 
    this.applyAllFilters();
    
    if (this.filterComponent) {
      this.filterComponent.resetFilters();
    }
    
    this.getActiveFiltersCount();
  }

  clearSideFilters(): void {
    this.currentPriceFilter = null;
    this.currentBrandFilter = null;
    this.currentPage = 1; 
    this.applyAllFilters();
    
    if (this.filterComponent) {
      this.filterComponent.resetFilters();
    }
    
    this.getActiveFiltersCount();
  }

  trackByProduct(index: number, product: Product): number {
    return product.id;
  }
}