import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.css']
})
export class PaymentComponent {
  cardNumber: string = '';
  expiryDate: string = '';
  cvv: string = '';
  detectedCardType: string = '';

  cardIcons: Record<string, string> = {
    visa: 'icons/visa.png',
    mastercard: 'icons/master-card.png',
    amex: 'icons/american (2).png',     
    unionpay: 'icons/union.png'
  };

  detectCardType(cardNumber: string): string {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    
    
    if (/^4/.test(cleanNumber)) return 'visa';
    if (/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber)) return 'mastercard';
    if (/^3[47]/.test(cleanNumber)) return 'amex';
    if (/^62/.test(cleanNumber)) return 'unionpay';
    
    return '';
  }

  onCardNumberChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    
    
    this.detectedCardType = this.detectCardType(value);
    console.log('Detected card type:', this.detectedCardType); 
    
    
    if (this.detectedCardType === 'amex') {
      
      if (value.length > 4 && value.length <= 10) {
        value = value.replace(/(\d{4})(\d{1,6})/, '$1 $2');
      } else if (value.length > 10) {
        value = value.replace(/(\d{4})(\d{6})(\d{1,5})/, '$1 $2 $3');
      }
    } else {
      
      value = value.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
    }
    
    input.value = value;
    this.cardNumber = value;
  }

  onExpiryDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    
    if (value.length >= 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    
    input.value = value;
    this.expiryDate = value;
  }

  onCvvChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '');
    const maxLength = this.detectedCardType === 'amex' ? 4 : 3;
    
    input.value = value.substring(0, maxLength);
    this.cvv = input.value;
  }

  getCvvLabel(): string {
    switch (this.detectedCardType) {
      case 'amex': return 'CID';
      case 'mastercard': return 'CVC';
      case 'unionpay': return 'CVN';
      default: return 'CVV';
    }
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    console.error('Failed to load image:', img.src);
   
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    
    
    if (!this.cardNumber || !this.expiryDate || !this.cvv) {
      console.log('Please fill all fields');
      return;
    }
    
    console.log({
      cardNumber: this.cardNumber,
      expiryDate: this.expiryDate,
      cvv: this.cvv,
      cardType: this.detectedCardType
    });
  }
}