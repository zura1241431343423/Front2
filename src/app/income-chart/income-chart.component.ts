import { CommonModule } from '@angular/common';
import { CartService } from '../services/cart.service'; 
import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { 
  Chart, 
  ChartConfiguration, 
  LinearScale,
  CategoryScale,
  PointElement,
  LineElement,
  LineController, 
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';


Chart.register(
  LinearScale,
  CategoryScale,
  PointElement,
  LineElement,
  LineController,  
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DailyIncome {
  date: string;
  totalIncome: number;
  orderCount: number;
  growthPercentage?: number;
}

@Component({
  selector: 'app-income-chart',
  standalone: true, 
  imports: [CommonModule], 
  templateUrl: './income-chart.component.html',
  styleUrls: ['./income-chart.component.css']
})
export class IncomeChartComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('chartCanvas', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  
  chart: Chart | null = null;
  totalIncome: number = 0;
  averageDailyGrowth: number = 0;
  isGrowthPositive: boolean = true;
  loading: boolean = false;
  error: string = '';
  dailyData: DailyIncome[] = [];

  constructor(private cartService: CartService) {}

  ngOnInit(): void {
    
  }

  ngAfterViewInit(): void {
   
    setTimeout(() => {
      this.loadIncomeData();
      
    }, 100);
  }

  private loadMockData(): void {
    this.loading = true;
    
   
    const mockOrders = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      mockOrders.push({
        orderDate: date.toISOString(),
        totalPrice: Math.random() * 500 + 100 
      });
    }
    
    this.dailyData = this.processDailyIncome(mockOrders);
    this.calculateMetrics();
    this.createChart();
    this.loading = false;
  }

  async loadIncomeData(): Promise<void> {
    this.loading = true;
    this.error = '';

    try {
      console.log('Loading income data...');
      
     
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      console.log('Date range:', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);

      const orders = await this.cartService.getOrdersByDateRange(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      ).toPromise();

      console.log('Orders received:', orders);

      if (orders && orders.length > 0) {
        this.dailyData = this.processDailyIncome(orders);
        console.log('Processed daily data:', this.dailyData);
        
        this.calculateMetrics();
        console.log('Metrics calculated - Total Income:', this.totalIncome, 'Growth:', this.averageDailyGrowth);
        
        
        setTimeout(() => {
          this.createChart();
        }, 500); 
      } else {
        this.error = 'No order data available for the selected period.';
        console.log('No orders found');
      }
    } catch (error) {
      console.error('Error loading income data:', error);
      this.error = 'Failed to load income data. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  private processDailyIncome(orders: any[]): DailyIncome[] {
    const dailyIncomeMap = new Map<string, DailyIncome>();

   
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyIncomeMap.set(dateStr, {
        date: dateStr,
        totalIncome: 0,
        orderCount: 0
      });
    }

    
    orders.forEach(order => {
      
      let orderDate: string;
      if (order.orderDate) {
        orderDate = new Date(order.orderDate).toISOString().split('T')[0];
      } else {
        console.warn('Order missing orderDate:', order);
        return;
      }

      const existing = dailyIncomeMap.get(orderDate);
      
      if (existing) {
        
        const totalPrice = typeof order.totalPrice === 'string' ? 
          parseFloat(order.totalPrice) : 
          (order.totalPrice || 0);
        
        existing.totalIncome += totalPrice;
        existing.orderCount += 1;
      }
    });

   
    const dailyIncomeArray = Array.from(dailyIncomeMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

   
    for (let i = 1; i < dailyIncomeArray.length; i++) {
      const prevDayIncome = dailyIncomeArray[i-1].totalIncome;
      const currentDayIncome = dailyIncomeArray[i].totalIncome;
      
      if (prevDayIncome > 0) {
        dailyIncomeArray[i].growthPercentage = ((currentDayIncome - prevDayIncome) / prevDayIncome) * 100;
      } else {
        dailyIncomeArray[i].growthPercentage = currentDayIncome > 0 ? 100 : 0;
      }
    }

    return dailyIncomeArray;
  }

  private calculateMetrics(): void {
  
    this.totalIncome = this.dailyData.reduce((sum, day) => sum + day.totalIncome, 0);

   
    const growthDays = this.dailyData.slice(1); 
    const totalGrowth = growthDays.reduce((sum, day) => sum + (day.growthPercentage || 0), 0);
    this.averageDailyGrowth = growthDays.length > 0 ? totalGrowth / growthDays.length : 0;
    this.isGrowthPositive = this.averageDailyGrowth >= 0;
  }

  private createChart(): void {
    if (!this.chartCanvas || !this.chartCanvas.nativeElement) {
      console.error('Canvas element not found via ViewChild');
      this.error = 'Chart canvas not found. Please refresh the page.';
      return;
    }

    const ctx = this.chartCanvas.nativeElement;
    console.log('Canvas element found via ViewChild, creating chart...');

   
    if (this.chart) {
      this.chart.destroy();
    }

    const labels = this.dailyData.map(data => {
      const date = new Date(data.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const incomeData = this.dailyData.map(data => data.totalIncome);
    const growthData = this.dailyData.map(data => data.growthPercentage || 0);

    console.log('Chart data prepared:', { labels, incomeData, growthData });

    const configuration: ChartConfiguration = {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Daily Income',
            data: incomeData,
            borderColor: '#4F46E5',
            backgroundColor: 'rgba(79, 70, 229, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#4F46E5',
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            yAxisID: 'y'
          },
          {
            label: 'Daily Growth %',
            data: growthData,
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 3,
            pointHoverRadius: 5,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#FFFFFF',
            bodyColor: '#FFFFFF',
            borderColor: '#4F46E5',
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.datasetIndex === 0) {
                  label += `$${context.parsed.y.toFixed(2)}`;
                } else {
                  label += `${context.parsed.y.toFixed(2)}%`;
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'category',
            grid: {
              display: false
            },
            ticks: {
              maxRotation: 45,
              minRotation: 45
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              callback: function(value: any) {
                return `$${value}`;
              }
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              callback: function(value: any) {
                return `${value}%`;
              }
            },
            min: -100 
          }
        }
      }
    };

    try {
      this.chart = new Chart(ctx, configuration);
      console.log('Chart created successfully');
    } catch (error) {
      console.error('Error creating chart:', error);
      this.error = 'Failed to create chart. Please try again.';
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }
}