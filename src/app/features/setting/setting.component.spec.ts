import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { AuthService } from '../../core/auth/services/auth.service';
import { SettingComponent } from './setting.component';

describe('SettingComponent', () => {
  let component: SettingComponent;
  let fixture: ComponentFixture<SettingComponent>;
  let authService: {
    changePassword: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authService = {
      changePassword: vi.fn(() =>
        of({
          success: true,
          message: 'Password changed successfully',
        }),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [SettingComponent],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders the change-password design and fields', () => {
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Change Password');
    expect(fixture.nativeElement.textContent).toContain(
      'Keep your account secure by using a strong password.',
    );
    expect(fixture.nativeElement.querySelector('[formControlName="password"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[formControlName="newPassword"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[formControlName="confirmPassword"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-update-password]')).toBeTruthy();
  });

  it('requires every field and validates the new password complexity', () => {
    component.submit();

    expect(component.changePasswordForm.invalid).toBe(true);
    expect(authService.changePassword).not.toHaveBeenCalled();
    expect(component.changePasswordForm.controls.password.touched).toBe(true);
    expect(component.changePasswordForm.controls.newPassword.touched).toBe(true);
    expect(component.changePasswordForm.controls.confirmPassword.touched).toBe(true);

    component.changePasswordForm.controls.newPassword.setValue('weakpassword');

    expect(component.changePasswordForm.controls.newPassword.hasError('pattern')).toBe(true);
  });

  it('rejects mismatched passwords and a new password equal to the current password', () => {
    component.changePasswordForm.setValue({
      password: 'Password1!',
      newPassword: 'Password1!',
      confirmPassword: 'Different2@',
    });

    expect(component.changePasswordForm.hasError('passwordUnchanged')).toBe(true);
    expect(component.changePasswordForm.hasError('passwordMismatch')).toBe(true);
    expect(authService.changePassword).not.toHaveBeenCalled();
  });

  it('trims password values, prevents duplicate submissions, and shows loading', () => {
    const request = new Subject<{ success: boolean; message: string }>();
    authService.changePassword.mockReturnValue(request);
    setValidForm();

    component.submit();
    component.submit();
    fixture.detectChanges();

    expect(authService.changePassword).toHaveBeenCalledTimes(1);
    expect(authService.changePassword).toHaveBeenCalledWith({
      password: 'OldPassword1!',
      newPassword: 'NewPassword2@',
    });
    expect(component.isSubmitting()).toBe(true);
    expect(component.changePasswordForm.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Updating password...');
    expect(fixture.nativeElement.querySelector('[data-update-password]').disabled).toBe(true);

    request.next({ success: true, message: 'Password changed successfully' });
    request.complete();
  });

  it('resets the form and shows an inline success message after success', () => {
    setValidForm();

    component.submit();
    fixture.detectChanges();

    expect(component.isSubmitting()).toBe(false);
    expect(component.changePasswordForm.enabled).toBe(true);
    expect(component.changePasswordForm.controls.password.value).toBe('');
    expect(component.changePasswordForm.controls.newPassword.value).toBe('');
    expect(component.changePasswordForm.controls.confirmPassword.value).toBe('');
    expect(fixture.nativeElement.textContent).toContain('Password changed successfully');
  });

  it('preserves values and restores controls after failure', () => {
    authService.changePassword.mockReturnValue(throwError(() => new Error('failed')));
    setValidForm();

    component.submit();

    expect(component.isSubmitting()).toBe(false);
    expect(component.changePasswordForm.enabled).toBe(true);
    expect(component.changePasswordForm.controls.password.value).toBe(' OldPassword1! ');
    expect(component.changePasswordForm.controls.newPassword.value).toBe(' NewPassword2@ ');
    expect(component.changePasswordForm.controls.confirmPassword.value).toBe(' NewPassword2@ ');
  });

  function setValidForm(): void {
    component.changePasswordForm.setValue({
      password: ' OldPassword1! ',
      newPassword: ' NewPassword2@ ',
      confirmPassword: ' NewPassword2@ ',
    });
  }
});
