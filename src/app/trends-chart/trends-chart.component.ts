import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../services/cart.service';

interface TopCountry {
  country: string;
  orderCount: number;
}

@Component({
  selector: 'app-trends-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trends-chart.component.html',
  styleUrls: ['./trends-chart.component.css']
})
export class TrendsChartComponent implements OnInit {
  topCountries: TopCountry[] = [];
  isLoading = false;
  error: string | null = null;

  constructor(private cartService: CartService) {}

  ngOnInit(): void {
    this.loadTopCountries();
  }

  loadTopCountries(): void {
    this.isLoading = true;
    this.error = null;
    
    this.cartService.getTopCountries().subscribe({
      next: (data) => {
        this.topCountries = data.slice(0, 15);
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to load country data';
        this.isLoading = false;
        console.error('Error loading top countries:', err);
      }
    });
  }

  getRankClass(index: number): string {
    if (index === 0) return 'rank-gold';
    if (index === 1) return 'rank-silver';
    if (index === 2) return 'rank-bronze';
    return 'rank-default';
  }

  getRankIcon(index: number): string {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}`;
  }
}