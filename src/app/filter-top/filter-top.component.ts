import { Component, EventEmitter, Input, OnInit, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product } from '../services/product.service';

export interface SortOption {
  value: string;
  label: string;
}

export interface TopFilterEvent {
  sortBy: string;
  category: string;
  subCategory?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
}

@Component({
  selector: 'app-filter-top',
  imports: [CommonModule, FormsModule],
  templateUrl: './filter-top.component.html',
  styleUrl: './filter-top.component.css',
  standalone: true,
})
export class FilterTopComponent implements OnInit, OnChanges {
  @Input() products: Product[] = [];
  @Input() filteredCount: number = 0;
  @Input() totalCount: number = 0;
  @Input() categoryName: string = '';
  @Input() initialSubcategory: string = '';
  showAdvancedFilters: boolean = true;

  @Input() showPriceFilters: boolean = true;
  @Input() showRatingFilter: boolean = true;
  @Input() showResultsCount: boolean = true;
  @Output() filterChange = new EventEmitter<TopFilterEvent>();
  @Output() sortedProducts = new EventEmitter<Product[]>();

  filterOptions: TopFilterEvent = {
    sortBy: 'default',
    category: 'all',
    subCategory: 'all'
  };

  sortOptions: SortOption[] = [
    { value: 'default', label: 'Default' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'name-asc', label: 'Name: A to Z' },
    { value: 'name-desc', label: 'Name: Z to A' },
    { value: 'rating-high', label: 'Highest Rated' },
    { value: 'rating-low', label: 'Lowest Rated' },
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' }
  ];

  availableCategories: string[] = [];
  availableSubCategories: string[] = [];

  ngOnInit() {
    this.extractCategories();
    this.extractSubCategories();
    
   
    if (this.initialSubcategory) {
      this.filterOptions.subCategory = this.initialSubcategory.toLowerCase();
 
      setTimeout(() => {
        this.onFilterChange();
      }, 0);
    }
  }

  ngOnChanges() {
    this.extractCategories();
    this.extractSubCategories();
    
   
    if (this.initialSubcategory && this.initialSubcategory !== this.filterOptions.subCategory) {
      this.filterOptions.subCategory = this.initialSubcategory.toLowerCase();
      this.onFilterChange();
    }
  }

  private extractCategories() {
    if (!this.products || this.products.length === 0) return;
    
    const categories = new Set<string>();
    this.products.forEach(product => {
      if (product.category) {
        categories.add(product.category.toLowerCase().trim());
      }
    });
    
    this.availableCategories = Array.from(categories).sort();
  }

  private extractSubCategories() {
    if (!this.products || this.products.length === 0) return;
    
    const subCategories = new Set<string>();
    this.products.forEach(product => {
      
      if (product.subCategory && 
          (!this.categoryName || 
           product.category?.toLowerCase().trim() === this.categoryName.toLowerCase().trim())) {
        subCategories.add(product.subCategory.toLowerCase().trim());
      }
    });
    
    this.availableSubCategories = Array.from(subCategories).sort();
  }

  onFilterChange() {
    
    if (this.filterOptions.category !== 'all') {
      this.filterSubCategoriesByCategory();
    } else {
      this.extractSubCategories();
    }
    
   
    this.filterChange.emit(this.filterOptions);
    
    
    this.applySorting();
  }

  onCategoryChange() {
    
    this.filterOptions.subCategory = 'all';
    this.onFilterChange();
  }

  private filterSubCategoriesByCategory() {
    if (!this.products || this.products.length === 0) return;
    
    const subCategories = new Set<string>();
    this.products.forEach(product => {
      if (product.subCategory && 
          (this.filterOptions.category === 'all' || 
           product.category?.toLowerCase().trim() === this.filterOptions.category.toLowerCase().trim())) {
        subCategories.add(product.subCategory.toLowerCase().trim());
      }
    });
    
    this.availableSubCategories = Array.from(subCategories).sort();
  }

  private applySorting() {
    if (!this.products || this.products.length === 0) {
      this.sortedProducts.emit([]);
      return;
    }

    let sortedProducts = [...this.products];

    switch (this.filterOptions.sortBy) {
      case 'price-low':
        sortedProducts.sort((a, b) => a.price - b.price);
        break;
      
      case 'price-high':
        sortedProducts.sort((a, b) => b.price - a.price);
        break;
      
      case 'name-asc':
        sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
        break;
      
      case 'name-desc':
        sortedProducts.sort((a, b) => b.name.localeCompare(a.name));
        break;
      
      case 'rating-high':
        sortedProducts.sort((a, b) => {
          const ratingA = a.averageRating || a.rating || 0;
          const ratingB = b.averageRating || b.rating || 0;
          return ratingB - ratingA;
        });
        break;
      
      case 'rating-low':
        sortedProducts.sort((a, b) => {
          const ratingA = a.averageRating || a.rating || 0;
          const ratingB = b.averageRating || b.rating || 0;
          return ratingA - ratingB;
        });
        break;
      
      case 'newest':
        sortedProducts.sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
          return 0;
        });
        break;
      
      case 'oldest':
        sortedProducts.sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          }
          return 0;
        });
        break;
      
      case 'default':
      default:
       
        sortedProducts.sort((a, b) => a.id - b.id);
        break;
    }

    this.sortedProducts.emit(sortedProducts);
  }

  hasActiveFilters(): boolean {
    return (
      this.filterOptions.sortBy !== 'default' ||
      this.filterOptions.category !== 'all' ||
      this.filterOptions.subCategory !== 'all' ||
      (this.filterOptions.minPrice !== undefined && this.filterOptions.minPrice !== null) ||
      (this.filterOptions.maxPrice !== undefined && this.filterOptions.maxPrice !== null) ||
      (this.filterOptions.minRating !== undefined && this.filterOptions.minRating !== null)
    );
  }

  clearFilters() {
    this.filterOptions = {
      sortBy: 'default',
      category: 'all',
      subCategory: 'all',
      minPrice: undefined,
      maxPrice: undefined,
      minRating: undefined
    };
    this.extractSubCategories(); 
    this.onFilterChange();
  }


  updateFilterOptions(options: Partial<TopFilterEvent>) {
    this.filterOptions = { ...this.filterOptions, ...options };
    this.onFilterChange();
  }

  
  setSubcategory(subcategory: string) {
    this.filterOptions.subCategory = subcategory.toLowerCase();
    this.onFilterChange();
  }
}