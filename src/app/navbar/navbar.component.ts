import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Product } from '../services/product.service';
import { CurrencyChangerComponent } from '../currency-changer/currency-changer.component';
import { SearchBarComponent } from '../search-bar/search-bar.component';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  rate: number;
}

interface Subcategory {
  id: string;
  name: string;
}

interface CategoryWithSubcategories {
  category: string;
  subcategories: Subcategory[];
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    CurrencyChangerComponent,
    SearchBarComponent
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  isLoggedIn = false;
  userRole: string | null = null;

  selectedCurrency: Currency = {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    rate: 1.0
  };

  categories: string[] = [];
  categorySubMap: CategoryWithSubcategories[] = [];
  isLoadingCategories = false;
  categoriesError = '';

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.checkAuth();
    this.loadSavedCurrency();
    this.loadCategoriesWithSubcategories();

    this.router.events.subscribe(() => {
      this.checkAuth();
    });
  }

  loadCategoriesWithSubcategories(): void {
    this.isLoadingCategories = true;
    this.categoriesError = '';

    this.http.get<CategoryWithSubcategories[]>('https://localhost:7233/api/products/categories-with-subcategories')
      .subscribe({
        next: (categories) => {
          this.categorySubMap = categories;
          this.categories = categories.map(c => c.category);
          this.isLoadingCategories = false;
        },
        error: (error) => {
          console.error('Error loading categories:', error);
          this.categoriesError = 'Failed to load categories';
          this.isLoadingCategories = false;
        }
      });
  }

  getSubcategoriesForCategory(categoryName: string): Subcategory[] {
    if (!this.categorySubMap || this.categorySubMap.length === 0) {
      return [];
    }

    const normalizedCategoryName = categoryName.trim().toLowerCase();
    const category = this.categorySubMap.find(cat =>
      cat.category.trim().toLowerCase() === normalizedCategoryName
    );

    return category?.subcategories || [];
  }

  formatCategorySlug(value: string): string {
    return value.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/&/g, 'and')
      .replace(/[',]/g, '');
  }

  getCategoryRoute(categoryName: string): string {
    return '/' + this.formatCategorySlug(categoryName);
  }

  getSubcategoryRoute(categoryName: string, subcategoryName: string): string {
    return `/category/${this.formatCategorySlug(categoryName)}/${this.formatCategorySlug(subcategoryName)}`;
  }

  trackBySubcategoryId(index: number, subcategory: Subcategory): string {
    return subcategory.id;
  }

  trackByCategory(index: number, category: string): string {
    return category;
  }

  checkAuth(): void {
    const token = localStorage.getItem('authToken');
    const role = localStorage.getItem('userRole');
    this.isLoggedIn = !!token;
    this.userRole = role;
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    this.isLoggedIn = false;
    this.userRole = null;
    this.router.navigate(['/home']);
  }

  onCurrencyChanged(currency: Currency): void {
    this.selectedCurrency = currency;
    localStorage.setItem('selectedCurrency', JSON.stringify(currency));
  }

  getCurrentCurrency(): Currency {
    return this.selectedCurrency;
  }

  onProductSelected(product: Product): void {
    this.router.navigate(['/product', product.id]);
  }

  onSearchPerformed(query: string): void {
    this.router.navigate(['/search'], { queryParams: { q: query } });
  }
  navigateToCategory(category: string): void {
  const route = this.getCategoryRoute(category);
  this.router.navigate([route]);
}

  private loadSavedCurrency(): void {
    const savedCurrency = localStorage.getItem('selectedCurrency');
    if (savedCurrency) {
      try {
        this.selectedCurrency = JSON.parse(savedCurrency);
      } catch (error) {
        console.warn('Failed to parse saved currency, using default');
      }
    }
  }
}
