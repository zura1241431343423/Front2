import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { Product } from '../services/product.service';

@Component({
  selector: 'app-favorite-card',
  templateUrl: './favorite-card.component.html',
  styleUrls: ['./favorite-card.component.css']
})
export class FavoriteCardComponent {
  @Input() product!: Product;
  @Output() remove = new EventEmitter<number>();

  constructor(private router: Router) {}

  onRemove(): void {
    this.remove.emit(this.product.id);
  }

  goToProductProfile(): void {
    this.router.navigate(['/product', this.product.id]);
  }
}