import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../core/auth/services/auth.service';

const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,}$/;

const trimmedRequired: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim() ? null : { required: true };

const passwordRelationshipValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.get('password')?.value?.trim() ?? '';
  const newPassword = control.get('newPassword')?.value?.trim() ?? '';
  const confirmPassword = control.get('confirmPassword')?.value?.trim() ?? '';
  const errors: ValidationErrors = {};

  if (newPassword && confirmPassword && newPassword !== confirmPassword) {
    errors['passwordMismatch'] = true;
  }

  if (password && newPassword && password === newPassword) {
    errors['passwordUnchanged'] = true;
  }

  return Object.keys(errors).length ? errors : null;
};

@Component({
  selector: 'app-setting',
  imports: [ReactiveFormsModule],
  templateUrl: './setting.component.html',
  styleUrl: './setting.component.css',
})
export class SettingComponent {
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);

  readonly isSubmitting = signal(false);
  readonly successMessage = signal<string | null>(null);

  readonly changePasswordForm = this.formBuilder.nonNullable.group(
    {
      password: ['', [trimmedRequired]],
      newPassword: [
        '',
        [trimmedRequired, Validators.minLength(8), Validators.pattern(PASSWORD_PATTERN)],
      ],
      confirmPassword: ['', [trimmedRequired]],
    },
    { validators: passwordRelationshipValidator },
  );

  submit(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.successMessage.set(null);

    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }

    const values = this.changePasswordForm.getRawValue();
    const request = {
      password: values.password.trim(),
      newPassword: values.newPassword.trim(),
    };

    this.isSubmitting.set(true);
    this.changePasswordForm.disable();

    this.authService.changePassword(request).subscribe({
      next: (response) => {
        this.changePasswordForm.reset();
        this.changePasswordForm.enable();
        this.isSubmitting.set(false);
        this.successMessage.set(response.message || 'Password changed successfully');
      },
      error: () => {
        this.changePasswordForm.enable();
        this.isSubmitting.set(false);
      },
    });
  }
}
