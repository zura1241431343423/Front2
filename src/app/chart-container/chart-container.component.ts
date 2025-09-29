import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IncomeChartComponent } from '../income-chart/income-chart.component';
import { PopularityChartsComponent } from '../popularity-charts/popularity-charts.component';
import { TrendsChartComponent } from '../trends-chart/trends-chart.component';

@Component({
  selector: 'app-chart-container',
  standalone: true,
  imports: [CommonModule, IncomeChartComponent, PopularityChartsComponent,TrendsChartComponent], 
  templateUrl: './chart-container.component.html',
  styleUrl: './chart-container.component.css'
})
export class ChartContainerComponent {
  selectedChart: string | null = null;

  showChart(chartType: string): void {
    this.selectedChart = chartType;
  }

  closeChart(): void {
    this.selectedChart = null;
  }
}

