import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';

interface LoginResponse {
  token: string;
  role: number | string;
  userId: number;
  name?: string;        
  lastName?: string;    
}

interface UserDetailsResponse {
  id: number;
  name: string;
  lastName: string;
  email: string;
  address?: string;
  role?: string;
}

interface RegisterResponse {
  success: boolean;
  message?: string;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  isRegisterMode = true;
  isForgotPasswordMode = false;
  isResetPasswordMode = false;

  email: string = '';
  showPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  isLoading = false;

  errorMessage = '';
  successMessage = '';

  resetToken: string = '';
  resetEmail: string = '';

  private apiUrl = 'https://localhost:7233/api';

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
  
    this.route.queryParams.subscribe(params => {
      console.log('Route params:', params);
      
      const token = params['token'];
      const email = params['email'];
      
      if (token && email) {
        console.log('Reset password mode activated', { token, email });
        this.resetToken = token;
        this.resetEmail = email;
        this.isResetPasswordMode = true;
        this.isRegisterMode = false;
        this.isForgotPasswordMode = false;
        this.clearMessages();
      }
    });
  }

  
  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  
  switchToRegister(): void {
    this.resetFormStates();
    this.isRegisterMode = true;
    this.router.navigate(['/register']); 
  }

  switchToLogin(): void {
    this.resetFormStates();
    this.isRegisterMode = false;
    this.router.navigate(['/register']); 
  }

  switchToForgotPassword(): void {
    this.resetFormStates();
    this.isForgotPasswordMode = true;
  }

  cancelForgotPassword(): void {
    this.resetFormStates();
  }

  private resetFormStates(): void {
    this.isRegisterMode = false;
    this.isForgotPasswordMode = false;
    this.isResetPasswordMode = false;
    this.clearMessages();
  }

  
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

 
  onSubmit(form: NgForm): void {
  if (!this.validateForm(form)) return;

  this.isLoading = true;
  this.clearMessages();

  switch (true) {
    case this.isResetPasswordMode:
      this.resetPassword(form);
      break;
    case this.isRegisterMode:
      this.register(form);
      break;
    case this.isForgotPasswordMode:
      this.requestPasswordReset(form);
      break;
    default:
      this.login(form);
  }
}


  private validateForm(form: NgForm): boolean {
    if (this.isForgotPasswordMode) {
      if (!form.controls['email']?.valid) {
        this.errorMessage = 'Please enter a valid email address.';
        return false;
      }
    } else if (!form.valid) {
      Object.keys(form.controls).forEach(field => {
        form.controls[field].markAsTouched();
      });
      this.errorMessage = 'Please fill in all required fields correctly.';
      return false;
    }
    return true;
  }

 
  private register(form: NgForm): void {
    const userData = {
      name: form.value.name,
      lastName: form.value.lastname,
      email: form.value.email,
      password: form.value.password,
      address: form.value.address
    };

    this.http.post<RegisterResponse>(`${this.apiUrl}/users`, userData).subscribe({
      next: () => {
        this.handleSuccess('Registration successful! Please login.');
        this.switchToLogin();
      },
      error: (error) => this.handleError(error, 'Registration failed.')
    });
  }

  private login(form: NgForm): void {
    const loginData = {
      Email: form.value.email,
      Password: form.value.password
    };

    this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, loginData).subscribe({
      next: (response) => {
        console.log('Login response:', response);

        if (!response?.token) {
          this.errorMessage = 'Login failed: No token received';
          return;
        }

        const roleValue = this.parseRole(response.role);
        const mappedRole = this.mapRole(roleValue);

        console.log(`Role mapping: ${response.role} -> ${roleValue} -> ${mappedRole}`);

        
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('userRole', mappedRole);
        localStorage.setItem('rawRole', String(response.role));
        localStorage.setItem('userId', String(response.userId));

       
        if (response.name && response.name !== 'undefined') {
          localStorage.setItem('name', response.name);
        }
        if (response.lastName && response.lastName !== 'undefined') {
          localStorage.setItem('lastName', response.lastName);
        }

        
        if (!response.name || !response.lastName || response.name === 'undefined' || response.lastName === 'undefined') {
          this.fetchUserDetails(response.userId);
        }

        this.router.navigate(['/dashboard']).then(() => {
      
          window.location.reload();
        });
      },
      error: (error) => {
        console.error('Login error:', error);
        this.handleError(error, 'Login failed.');
      }
    });
  }


  private fetchUserDetails(userId: number): void {
    this.http.get<UserDetailsResponse>(`${this.apiUrl}/users/${userId}`).subscribe({
      next: (userDetails) => {
        console.log('User details fetched:', userDetails);
        
        
        if (userDetails.name) {
          localStorage.setItem('name', userDetails.name);
        }
        if (userDetails.lastName) {
          localStorage.setItem('lastName', userDetails.lastName);
        }
        
        console.log('Updated localStorage with user details');
      },
      error: (error) => {
        console.error('Error fetching user details:', error);
        
        localStorage.setItem('name', 'User');
        localStorage.setItem('lastName', '');
      }
    });
  }

  private parseRole(role: any): number {
    if (typeof role === 'number') {
      return role;
    }
    
    if (typeof role === 'string') {
      
      if (role === 'Admin') return 0;
      if (role === 'Manager') return 1;
      if (role === 'User') return 2;
      
  
      const parsed = parseInt(role, 10);
      if (!isNaN(parsed)) return parsed;
    }
    
    console.warn('Unknown role value, defaulting to User (2)', role);
    return 2; 
  }

  private mapRole(roleIndex: number): string {
    const roleMap: Record<number, string> = {
      0: 'Admin',
      1: 'Manager',
      2: 'User'
    };
    return roleMap[roleIndex] || 'User';
  }

  private requestPasswordReset(form: NgForm): void {
    this.http.post(`${this.apiUrl}/auth/forgot-password`, { email: form.value.email })
      .subscribe({
        next: () => this.handleSuccess('Password reset link sent! Check your email.'),
        error: (error) => this.handleError(error, 'Failed to send reset link.')
      });
  }

  private resetPassword(form: NgForm): void {
    if (!form.valid) {
      this.errorMessage = 'Please fill in all required fields correctly.';
      return;
    }

    if (!form.controls['newPassword']?.valid) {
      this.errorMessage = 'Please enter a valid password (min 8 characters).';
      return;
    }

    if (form.value.newPassword !== form.value.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.isLoading = true;
    this.clearMessages();

    const resetData = {
      token: this.resetToken,
      email: this.resetEmail,
      newPassword: form.value.newPassword
    };

    console.log('Sending reset password request:', { 
      token: this.resetToken, 
      email: this.resetEmail 
    });

    this.http.post(`${this.apiUrl}/auth/reset-password`, resetData).subscribe({
      next: () => {
        this.handleSuccess('Password reset successfully! You can now login with your new password.');
        setTimeout(() => {
          this.isResetPasswordMode = false;
          this.switchToLogin();
        }, 3000);
      },
      error: (error) => this.handleError(error, 'Failed to reset password. The token may be invalid or expired.')
    });
  }

  
  private handleSuccess(message: string): void {
    this.isLoading = false;
    this.successMessage = message;
  }

  private handleError(error: any, defaultMessage: string): void {
    this.isLoading = false;
    
    console.error('API Error:', error);
    
    if (error.error && typeof error.error === 'string') {
      this.errorMessage = error.error;
    } else if (error.error && error.error.message) {
      this.errorMessage = error.error.message;
    } else if (error.error && error.error.title) {
      this.errorMessage = error.error.title;
    } else if (error.message) {
      this.errorMessage = error.message;
    } else {
      this.errorMessage = `${defaultMessage} Please try again.`;
    }
    
    this.successMessage = '';
  }
}