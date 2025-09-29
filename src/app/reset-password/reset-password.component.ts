import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http'; 
import { NgForm, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
 
  standalone: true,
  imports: [FormsModule, CommonModule, HttpClientModule] 
})
export class ResetPasswordComponent implements OnInit {

  apiUrl = 'https://localhost:7233/api'; 
  showPassword = false;
  showConfirmPassword = false; 
  
  
  isResettingPasswordMode: boolean = false; 

 
  email: string = '';
  newPassword: string = '';
  confirmPassword: string = '';

  
  resetToken: string = '';
  resetEmail: string = '';

  
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;
newPasswordControl: any;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {

    this.route.queryParams.subscribe(params => {
      this.resetToken = params['token'] || '';
      this.resetEmail = params['email'] || '';

     
      this.isResettingPasswordMode = !!(this.resetToken && this.resetEmail);

      
      if (this.isResettingPasswordMode) {
        this.email = this.resetEmail;
      }
    });

    
    if (!this.isResettingPasswordMode) {
      this.errorMessage = 'Please provide a valid password reset link.';
     
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  resetPassword(form: NgForm): void {
    this.clearMessages(); 
    
   
    form.control.markAllAsTouched();

    if (!form.valid) {
      this.errorMessage = 'Please fill in all required fields correctly.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.isLoading = true;

    const resetData = {
      token: this.resetToken,
      email: this.resetEmail,
      newPassword: this.newPassword 
    };

    console.log('Sending reset password request:', resetData);

    this.http.post(`${this.apiUrl}/auth/reset-password`, resetData).subscribe({
      next: () => {
        this.handleSuccess('Password reset successfully! You can now login with your new password.');
        
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: (error) => this.handleError(error, 'Failed to reset password. The token may be invalid or expired.')
    });
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private handleSuccess(message: string): void {
    this.successMessage = message;
    this.isLoading = false;
  }

  private handleError(error: any, fallbackMessage: string): void {
    console.error('Reset error:', error);
   
    this.errorMessage = error?.error?.message || error?.error?.detail || fallbackMessage;
    this.isLoading = false;
  }
}