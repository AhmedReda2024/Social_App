import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  registerForm!: FormGroup;
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.formInitialization();
  }

  formInitialization() {
    this.registerForm = this.fb.group(
      {
        name: ['', [Validators.required, Validators.minLength(2)]],
        username: [''],
        email: [
          '',
          [Validators.required, Validators.pattern(/[^@ \t\r\n]+@[^@ \t\r\n]+\.[^@ \t\r\n]+/)],
        ],
        dateOfBirth: ['', [Validators.required]],
        gender: ['', [Validators.required]],
        password: [
          '',
          [
            Validators.required,
            Validators.pattern(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$ %^&*-]).{8,}$/),
          ],
        ],
        rePassword: ['', [Validators.required]],
      },
      {
        validators: [this.passwordMatchValidator],
      },
    );
  }

  passwordMatchValidator(control: AbstractControl) {
    return control.get('password')?.value === control.get('rePassword')?.value
      ? null
      : { mismatch: true };
  }

  sendRegisterForm() {
    if (this.registerForm.valid) {
      this.isLoading.set(true);
      this.authService.signUp(this.registerForm.value).subscribe({
        next: (res) => {
          if (res.success) {
            this.errorMessage.set(null);
            this.isLoading.set(false);
            this.router.navigate(['/login']);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.error.message);
        },
      });
    } else {
      this.registerForm.markAllAsTouched();
    }
  }
}
