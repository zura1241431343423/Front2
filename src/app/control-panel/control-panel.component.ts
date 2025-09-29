import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserMenuComponent } from '../user-menu/user-menu.component';
import { OrderMenuComponent } from '../order-menu/order-menu.component';
import { ChartContainerComponent } from "../chart-container/chart-container.component";

interface Product {
  id?: number;
  name: string;
  brand: string;
  price: number;
  discountedPrice?: number | null;
  discountPercentage?: number | null;
  category: string;
  subCategory: string;
  quantity: number;
  warranty: number;
  images: string[];
}

interface ProductUpdate {
  id: number;
  quantity?: number;
  discountPercentage?: number | null;
  removeDiscount?: boolean;
}

@Component({
  selector: 'app-control-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    OrderMenuComponent,
    UserMenuComponent,
    ChartContainerComponent
],
  templateUrl: './control-panel.component.html',
  styleUrls: ['./control-panel.component.css']
})
export class ControlPanelComponent implements OnInit {
  apiUrl: string = 'https://localhost:7233/api/products';

  selectedView: string = 'products';
  selectedProductCategory: string | null = null;
  isProductsDropdownVisible: boolean = false;
  isNewProductFormVisible: boolean = false;
  imageUrlsInput: string = '';
  allProducts: Product[] = [];

  hasUnsavedChanges: boolean = false;
  pendingChanges: Map<number, ProductUpdate> = new Map();
  tempDiscountValues: Map<number, number> = new Map();

  newProduct: Product = {
    name: '',
    brand: '',
    price: 0,
    category: '',
    subCategory: '',
    quantity: 0,
    warranty: 0,
    images: []
  };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchProducts();
  }

  fetchProducts(): void {
    this.http.get<Product[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.allProducts = data;
      },
      error: (err) => {
        console.error('Failed to load products:', err);
      }
    });
  }

  getProductsByCategory(category: string): void {
    const url = `${this.apiUrl}/category/${encodeURIComponent(category)}`;
    this.http.get<Product[]>(url).subscribe({
      next: (data) => {
        this.allProducts = data;
        this.selectedProductCategory = category;
      },
      error: (err) => {
        console.error(`Failed to load products for category ${category}:`, err);
      }
    });
  }

  selectView(viewName: string): void {
    this.selectedView = viewName;
    this.selectedProductCategory = null;
    this.isProductsDropdownVisible = false;
    this.isNewProductFormVisible = false;
    
    if (viewName === 'products') {
      this.fetchProducts();
    }
    
   
    if (viewName !== 'products') {
      this.resetChanges();
    }
  }

 
  isCustomersViewSelected(): boolean {
    return this.selectedView === 'customers';
  }

  
  isProductsViewSelected(): boolean {
    return this.selectedView === 'products';
  }

  toggleProductsDropdown(): void {
    this.isProductsDropdownVisible = !this.isProductsDropdownVisible;
    if (this.isProductsDropdownVisible) {
      this.isNewProductFormVisible = false;
    }
  }

  toggleNewProductForm(): void {
    this.isNewProductFormVisible = !this.isNewProductFormVisible;
    if (this.isNewProductFormVisible) {
      this.isProductsDropdownVisible = false;
      this.selectedProductCategory = null;
    }
  }

  selectProductSubCategory(category: string): void {
    this.selectedProductCategory = category;
    this.isProductsDropdownVisible = false;
    this.isNewProductFormVisible = false;
    this.getProductsByCategory(category);
  }

  submitNewProduct(): void {
    if (!this.newProduct.name || !this.newProduct.brand || !this.newProduct.category) {
      alert('Please fill in all required fields (Name, Brand, Category)');
      return;
    }

    if (this.newProduct.price <= 0) {
      alert('Please enter a valid price');
      return;
    }

    const imageUrls = this.imageUrlsInput
      .split(',')
      .map(url => url.trim())
      .filter(url => url !== '');

    const productData = {
      ...this.newProduct,
      images: imageUrls.length > 0 ? imageUrls : ['https://via.placeholder.com/200x200?text=No+Image'],
      createdAt: new Date().toISOString(),
      ratingSum: 0,
      ratingCount: 0
    };

    this.http.post(this.apiUrl, productData).subscribe({
      next: () => {
        alert('Product added successfully!');
        this.selectedProductCategory ? this.getProductsByCategory(this.selectedProductCategory) : this.fetchProducts();
        this.resetProductForm();
      },
      error: (err) => {
        console.error('Error adding product:', err);
        if (err.error?.errors) {
          const errors = Object.values(err.error.errors).flat();
          alert(`Validation errors:\n${errors.join('\n')}`);
        } else {
          alert('Failed to add product. Please check console for details.');
        }
      }
    });
  }

  resetProductForm(): void {
    this.isNewProductFormVisible = false;
    this.newProduct = {
      name: '',
      brand: '',
      price: 0,
      category: '',
      subCategory: '',
      quantity: 0,
      warranty: 0,
      images: []
    };
    this.imageUrlsInput = '';
  }

  onQuantityChange(product: Product, event: Event): void {
    const input = event.target as HTMLInputElement;
    const newQuantity = Number(input.value);

    if (product.id) {
      const existingChange = this.pendingChanges.get(product.id) || { id: product.id };
      existingChange.quantity = newQuantity;
      this.pendingChanges.set(product.id, existingChange);
      this.hasUnsavedChanges = true;
    }
  }

  onDiscountChange(product: Product, event: Event): void {
    const input = event.target as HTMLInputElement;
    const discountValue = Number(input.value);

    if (product.id && discountValue >= 1 && discountValue <= 100) {
      this.tempDiscountValues.set(product.id, discountValue);
    } else if (product.id) {
      this.tempDiscountValues.delete(product.id);
    }
  }

  applyDiscount(product: Product, discountInput: HTMLInputElement): void {
    const discountValue = Number(discountInput.value);

    if (!product.id || discountValue < 1 || discountValue > 100) {
      alert('Please enter a valid discount percentage between 1 and 100');
      return;
    }

    const existingChange = this.pendingChanges.get(product.id) || { id: product.id };
    existingChange.discountPercentage = Math.round(discountValue);
    existingChange.removeDiscount = false;
    this.pendingChanges.set(product.id, existingChange);
    this.tempDiscountValues.set(product.id, discountValue);
    this.hasUnsavedChanges = true;
  }

  removeDiscount(product: Product): void {
    if (!product.id) return;

    const existingChange = this.pendingChanges.get(product.id) || { id: product.id };
    existingChange.discountPercentage = null;
    existingChange.removeDiscount = true;
    this.pendingChanges.set(product.id, existingChange);
    this.tempDiscountValues.delete(product.id);
    this.hasUnsavedChanges = true;
  }

  hasActiveDiscount(product: Product): boolean {
    if (product.id && this.pendingChanges.has(product.id)) {
      const pendingChange = this.pendingChanges.get(product.id);
      if (pendingChange?.removeDiscount) return false;
      return pendingChange?.discountPercentage !== null && pendingChange?.discountPercentage !== undefined;
    }
    return product.discountPercentage !== null && product.discountPercentage !== undefined;
  }

  hasUnsavedDiscount(product: Product): boolean {
    if (!product.id) return false;
    const pendingChange = this.pendingChanges.get(product.id);
    if (!pendingChange) return false;
    return pendingChange.discountPercentage !== product.discountPercentage || 
           pendingChange.removeDiscount === true;
  }

  getTempDiscountValue(product: Product): number | null {
    if (!product.id) return null;
    const pendingChange = this.pendingChanges.get(product.id);
    if (pendingChange) {
      if (pendingChange.removeDiscount) return null;
      if (pendingChange.discountPercentage !== undefined) {
        return pendingChange.discountPercentage;
      }
    }
    return this.tempDiscountValues.get(product.id) || product.discountPercentage || null;
  }

  getFinalPrice(product: Product): number {
    let discountPercentage: number | null = null;
    if (product.id && this.pendingChanges.has(product.id)) {
      const pendingChange = this.pendingChanges.get(product.id);
      if (pendingChange?.removeDiscount) {
        discountPercentage = null;
      } else {
        discountPercentage = pendingChange?.discountPercentage || null;
      }
    } else {
      discountPercentage = product.discountPercentage || null;
    }
    if (discountPercentage) {
      return product.price - (product.price * discountPercentage / 100);
    }
    return product.price;
  }

  getDiscountDisplay(product: Product): string {
    let discountPercentage: number | null = null;
    if (product.id && this.pendingChanges.has(product.id)) {
      const pendingChange = this.pendingChanges.get(product.id);
      if (pendingChange?.removeDiscount) {
        discountPercentage = null;
      } else {
        discountPercentage = pendingChange?.discountPercentage || null;
      }
    } else {
      discountPercentage = product.discountPercentage || null;
    }
    return discountPercentage ? `${discountPercentage}% OFF` : '';
  }

  saveAllChanges(): void {
    if (this.pendingChanges.size === 0) {
      this.hasUnsavedChanges = false;
      return;
    }

    const updatePromises: Promise<any>[] = [];
    this.pendingChanges.forEach((change, productId) => {
      const updateData: any = {};
      if (change.quantity !== undefined) {
        updateData.quantity = change.quantity;
      }
      if (change.discountPercentage !== undefined || change.removeDiscount) {
        updateData.discountPercentage = change.discountPercentage;
        updateData.removeDiscount = change.removeDiscount;
      }
      const promise = this.http.put(`${this.apiUrl}/${productId}/partial-update`, updateData).toPromise();
      updatePromises.push(promise);
    });

    Promise.all(updatePromises)
      .then(() => {
        alert('All changes saved successfully!');
        this.fetchProducts();
        this.resetChanges();
      })
      .catch((error) => {
        console.error('Error saving changes:', error);
        alert('Failed to save some changes. Please check console for details.');
      });
  }

  resetChanges(): void {
    this.pendingChanges.clear();
    this.tempDiscountValues.clear();
    this.hasUnsavedChanges = false;
  }

  get filteredProducts(): Product[] {
    const selectedCategory = this.selectedProductCategory;
    if (!selectedCategory) return [];
    return this.allProducts.filter(p => p.category.toLowerCase() === selectedCategory.toLowerCase());
  }
}