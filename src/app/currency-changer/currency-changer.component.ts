import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrencyService } from '../services/currency-service.service';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  rate: number;
}

@Component({
  selector: 'app-currency-changer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './currency-changer.component.html',
  styleUrls: ['./currency-changer.component.css']
})
export class CurrencyChangerComponent implements OnInit {
  @Output() currencyChanged = new EventEmitter<Currency>();

  selectedCurrency!: Currency;
  isDropdownOpen = false;
  currencies: Currency[] = [];

  constructor(private currencyService: CurrencyService) {}

  ngOnInit(): void {
    this.initializeCurrencies();
    
    
    this.selectedCurrency = this.currencyService.getCurrentCurrency();
  }

  private initializeCurrencies(): void {
    const rates = this.currencyService.getCurrentRates();
        
    this.currencies = [
      { code: 'USD', name: 'US Dollar', symbol: '$', rate: rates['USD'] || 1.0 },
      { code: 'EUR', name: 'Euro', symbol: '€', rate: rates['EUR'] || 0.85 },
      { code: 'GBP', name: 'British Pound', symbol: '£', rate: rates['GBP'] || 0.73 },
      { code: 'RUB', name: 'Russian Ruble', symbol: '₽', rate: rates['RUB'] || 75.0 },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', rate: rates['CNY'] || 6.45 },
      { code: 'GEL', name: 'Georgian Lari', symbol: '₾', rate: rates['GEL'] || 2.65 },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥', rate: rates['JPY'] || 110.0 },
      { code: 'INR', name: 'Indian Rupee', symbol: '₹', rate: rates['INR'] || 74.5 },
      { code: 'TRY', name: 'Turkish Lira', symbol: '₺', rate: rates['TRY'] || 8.5 }
    ];


    if (!this.selectedCurrency) {
      this.selectedCurrency = this.currencies.find(c => c.code === 'USD') || this.currencies[0];
    }
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  selectCurrency(currency: Currency): void {
    this.selectedCurrency = currency;
    
   
    this.currencyService.setCurrency(currency);
    
    
    this.currencyChanged.emit(currency);
    this.isDropdownOpen = false;
  }
}