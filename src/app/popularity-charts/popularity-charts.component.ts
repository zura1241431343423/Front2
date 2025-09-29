import { Component, OnInit } from '@angular/core';
import { ProductService, Product } from '../services/product.service';
import { CartService } from '../services/cart.service';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

interface RankingProduct {
  id: number;
  name: string;
  brand: string;
  price: number;
  discountedPrice?: number;
  image: string;
  rating: number;
  ratingCount: number;
  soldCount?: number;
  totalQuantity?: number;
}

interface PopularProduct {
  productId: number;
  product: Product;
  orderCount: number;
  totalQuantity: number;
  lastOrderDate: string;
}

interface TopRatedProduct {
  id: number;
  name: string;
  brand: string;
  price: number;
  discountedPrice?: number;
  category: string;
  subCategory: string;
  images: string[];
  averageRating: number;
  ratingCount: number;
  ratingSum: number;
}

@Component({
  selector: 'app-popularity-charts',
  standalone: true,
   imports: [CommonModule, ],
  templateUrl: './popularity-charts.component.html',
  styleUrls: ['./popularity-charts.component.css']
})
export class PopularityChartsComponent implements OnInit {
  mostSoldProducts: RankingProduct[] = [];
  highestRatedProducts: RankingProduct[] = [];
  leastSoldProducts: RankingProduct[] = [];
  lowestRatedProducts: RankingProduct[] = [];
  
  isLoading = true;
  error: string | null = null;

  private ratingApiUrl = 'https://localhost:7233/api/rating';

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadPopularityData();
  }

  private loadPopularityData(): void {
    this.isLoading = true;
    this.error = null;

    forkJoin({
      popularProducts: this.loadMostSoldProducts(),
      topRatedProducts: this.loadTopRatedProducts(),
      allProducts: this.productService.getAllProducts(),
      allOrderStats: this.cartService.getAllOrderStatistics()
    }).subscribe({
      next: (data) => {
        this.processMostSoldProducts(data.popularProducts);
        this.processTopRatedProducts(data.topRatedProducts);
        this.processLeastSoldProducts(data.allProducts, data.allOrderStats);
        this.processLowestRatedProducts(data.topRatedProducts);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading popularity data:', error);
        this.error = 'Failed to load popularity data. Please try again.';
        this.isLoading = false;
      }
    });
  }

  private loadMostSoldProducts(): Observable<PopularProduct[]> {
  return forkJoin({
    stats: this.cartService.getMostPopularProducts(50),
    products: this.productService.getAllProducts()
  }).pipe(
    map(({ stats, products }) => {
      return stats.map(stat => {
        const product = products.find(p => p.id === stat.productId);

        if (!product) return null;

        return {
          productId: stat.productId,
          product: product,
          orderCount: stat.totalOrders,
          totalQuantity: stat.totalQuantity,
          lastOrderDate: stat.lastOrderDate
        };
      }).filter((item): item is PopularProduct => item !== null);
    }),
    catchError(error => {
      console.error('Error merging product info:', error);
      return of([]);
    })
  );
}

  private loadTopRatedProducts(): Observable<TopRatedProduct[]> {
    return this.http.get<TopRatedProduct[]>(`${this.ratingApiUrl}/top-rated`).pipe(
      catchError(error => {
        console.error('Error fetching top rated products:', error);
        return of([]);
      })
    );
  }

  private processMostSoldProducts(popularProducts: PopularProduct[]): void {
    this.mostSoldProducts = popularProducts.slice(0, 10).map(item => ({
      id: item.product.id,
      name: item.product.name,
      brand: item.product.brand,
      price: item.product.price,
      discountedPrice: item.product.discountedPrice,
      image: item.product.images && item.product.images.length > 0 ? item.product.images[0] : '/assets/no-image.jpg',
      rating: item.product.averageRating || 0,
      ratingCount: item.product.ratingCount || 0,
      soldCount: item.orderCount,
      totalQuantity: item.totalQuantity
    }));
  }

  private processTopRatedProducts(topRatedProducts: TopRatedProduct[]): void {
    this.highestRatedProducts = topRatedProducts.slice(0, 10).map(product => ({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      discountedPrice: product.discountedPrice,
      image: product.images && product.images.length > 0 ? product.images[0] : '/assets/no-image.jpg',
      rating: product.averageRating,
      ratingCount: product.ratingCount
    }));
  }

  private processLeastSoldProducts(allProducts: Product[], orderStats: any[]): void {
    // Create a map of product sales data
    const salesMap = new Map<number, { orderCount: number; totalQuantity: number }>();
    
    orderStats.forEach(stat => {
      salesMap.set(stat.productId, {
        orderCount: stat.totalOrders || 0,
        totalQuantity: stat.totalQuantity || 0
      });
    });

   
    const productsWithSales = allProducts.map(product => {
      const salesData = salesMap.get(product.id) || { orderCount: 0, totalQuantity: 0 };
      return {
        id: product.id,
        name: product.name,
        brand: product.brand,
        price: product.price,
        discountedPrice: product.discountedPrice,
        image: product.images && product.images.length > 0 ? product.images[0] : '/assets/no-image.jpg',
        rating: product.averageRating || 0,
        ratingCount: product.ratingCount || 0,
        soldCount: salesData.orderCount,
        totalQuantity: salesData.totalQuantity
      };
    });

    
    this.leastSoldProducts = productsWithSales
      .sort((a, b) => a.totalQuantity - b.totalQuantity)
      .slice(0, 10);
  }

  private processLowestRatedProducts(topRatedProducts: TopRatedProduct[]): void {
 
    const lowestRated = topRatedProducts
      .filter(product => product.averageRating > 0) 
      .sort((a, b) => a.averageRating - b.averageRating)
      .slice(0, 10);

    this.lowestRatedProducts = lowestRated.map(product => ({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      discountedPrice: product.discountedPrice,
      image: product.images && product.images.length > 0 ? product.images[0] : '/assets/no-image.jpg',
      rating: product.averageRating,
      ratingCount: product.ratingCount
    }));
  }

  getStarArray(rating: number): boolean[] {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(true);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(true); 
      } else {
        stars.push(false);
      }
    }
    return stars;
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  }

  onImageError(event: any): void {
    event.target.src = '/assets/no-image.jpg';
  }

  refreshData(): void {
    this.loadPopularityData();
  }
}