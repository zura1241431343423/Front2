import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  rate: number;
}

interface ExchangeRateResponse {
  rates: { [key: string]: number };
  base: string;
  date: string;
}

@Injectable({
  providedIn: 'root'
})
export class CurrencyService {
  private currentRates = new BehaviorSubject<{ [key: string]: number }>({});
  

  private currentCurrencySubject = new BehaviorSubject<Currency>({
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    rate: 1.0
  });


  public currentCurrency$ = this.currentCurrencySubject.asObservable();

  private availableCurrencies: Currency[] = [
    { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1.0 },
    { code: 'EUR', name: 'Euro', symbol: '€', rate: 0.85 },
    { code: 'GBP', name: 'British Pound', symbol: '£', rate: 0.73 },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', rate: 110.0 },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', rate: 1.25 },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', rate: 1.35 },
    { code: 'RUB', name: 'Russian Ruble', symbol: '₽', rate: 75.0 },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', rate: 6.45 },
    { code: 'GEL', name: 'Georgian Lari', symbol: '₾', rate: 2.65 },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', rate: 74.5 },
    { code: 'TRY', name: 'Turkish Lira', symbol: '₺', rate: 8.5 }
  ];

  constructor(private http: HttpClient) {
    this.loadExchangeRates();
  }

  private loadExchangeRates(): void {

    const apiUrl = 'https://api.exchangerate-api.com/v4/latest/USD';
        
    this.http.get<ExchangeRateResponse>(apiUrl)
      .pipe(
        map(response => response.rates),
        catchError(error => {
          console.error('Failed to fetch exchange rates, using defaults', error);
          return of(this.getDefaultRates());
        })
      )
      .subscribe(rates => {
        this.currentRates.next(rates);
        this.updateCurrencyRates(rates);
      
        this.updateCurrentCurrencyRate(rates);
      });
  }

  private getDefaultRates(): { [key: string]: number } {
    return this.availableCurrencies.reduce((acc, curr) => {
      acc[curr.code] = curr.rate;
      return acc;
    }, {} as { [key: string]: number });
  }

  private updateCurrencyRates(rates: { [key: string]: number }): void {
    this.availableCurrencies = this.availableCurrencies.map(currency => ({
      ...currency,
      rate: rates[currency.code] || currency.rate
    }));
  }

  private updateCurrentCurrencyRate(rates: { [key: string]: number }): void {
    const current = this.currentCurrencySubject.value;
    const updatedRate = rates[current.code] || current.rate;
    
    if (updatedRate !== current.rate) {
      const updatedCurrency = { ...current, rate: updatedRate };
      this.currentCurrencySubject.next(updatedCurrency);
    }
  }

  getCurrencies(): Currency[] {
    return this.availableCurrencies;
  }

  getCurrentRates(): { [key: string]: number } {
    return this.currentRates.value;
  }


  getCurrentCurrency(): Currency {
    return this.currentCurrencySubject.value;
  }

  setCurrency(currency: Currency): void {

    const rates = this.currentRates.value;
    const updatedCurrency = {
      ...currency,
      rate: rates[currency.code] || currency.rate
    };
    
    this.currentCurrencySubject.next(updatedCurrency);
  }

  convert(amount: number, fromCurrency: string, toCurrency: string): number {
    const rates = this.currentRates.value;
    if (!rates[fromCurrency] || !rates[toCurrency]) return amount;

    const usdAmount = amount / rates[fromCurrency];
    return usdAmount * rates[toCurrency];
  }


  convertPrice(usdPrice: number, targetCurrency: string): number {
    const rates = this.currentRates.value;
    const rate = rates[targetCurrency] || 1.0;
    return usdPrice * rate;
  }

  convertBetweenCurrencies(amount: number, fromCurrency: string, toCurrency: string): number {
    const rates = this.currentRates.value;
    const fromRate = rates[fromCurrency] || 1.0;
    const toRate = rates[toCurrency] || 1.0;
    

    const usdAmount = amount / fromRate;
    return usdAmount * toRate;
  }

  format(amount: number, currencyCode: string): string {
    const currency = this.availableCurrencies.find(c => c.code === currencyCode);
    if (!currency) return `${amount.toFixed(2)}`;
        
    return `${currency.symbol}${amount.toFixed(2)}`;
  }

  formatCurrentCurrency(amount: number): string {
    const current = this.currentCurrencySubject.value;
    return `${current.symbol}${amount.toFixed(2)}`;
  }

  refreshRates(): void {
    this.loadExchangeRates();
  }
}