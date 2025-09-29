import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductCarouselComponent } from '../product-carousel/product-carousel.component';
import { NewlyAddedProductsComponent } from '../newly-added-products/newly-added-products.component';
import { PopularProductsComponent } from '../popular-products/popular-products.component';
import { TopRatedProductsComponent } from '../top-rated-products/top-rated-products.component';
import { RecommendationProductsComponent } from '../recommendation-products/recommendation-products.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ProductCarouselComponent,NewlyAddedProductsComponent,PopularProductsComponent,TopRatedProductsComponent,RecommendationProductsComponent ],  
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  
}