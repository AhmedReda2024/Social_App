import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  loginForm!: FormGroup;
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.formInitialization();
  }

  formInitialization() {
    this.loginForm = this.fb.group({
      email: [
        '',
        [Validators.required, Validators.pattern(/[^@ \t\r\n]+@[^@ \t\r\n]+\.[^@ \t\r\n]+/)],
      ],
      password: [
        '',
        [
          Validators.required,
          Validators.pattern(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$ %^&*-]).{8,}$/),
        ],
      ],
    });
  }

  sendLoginForm() {
    if (this.loginForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      this.authService.signIn(this.loginForm.value).subscribe({
        next: (res) => {
          if (res.data.token) {
            localStorage.setItem('token', res.data.token);
          }
          this.isLoading.set(false);
          this.errorMessage.set(null);
          this.router.navigate(['/feed']);
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading.set(false);
          this.errorMessage.set(
            err.error?.message || 'An unexpected error occurred. Please try again.',
          );
        },
      });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}
