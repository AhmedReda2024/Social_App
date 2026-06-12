import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  it('requests the authenticated profile data', () => {
    service.getProfileData().subscribe();

    const request = httpController.expectOne(`${environment.base_url}/users/profile-data`);
    expect(request.request.method).toBe('GET');
    const response = {
      success: true,
      message: 'success',
      data: {
        name: 'Ahmed Reda',
        username: 'ahmed_reda',
        email: 'ahmed@example.com',
        photo: '',
        cover: 'cover.jpg',
      },
    };
    request.flush(response);

    expect(service.currentUser()).toEqual(response.data);
  });

  it('uploads a profile photo with privacy', () => {
    const photo = new Blob(['photo'], { type: 'image/jpeg' });
    service.uploadProfilePhoto(photo, 'only_me').subscribe();

    const request = httpController.expectOne(`${environment.base_url}/users/upload-photo`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toBeInstanceOf(FormData);
    expect(request.request.body.get('photo')).toBeTruthy();
    expect(request.request.body.get('privacy')).toBe('only_me');
    request.flush({ success: true });
  });

  it('uploads and removes a cover photo', () => {
    const cover = new File(['cover'], 'cover.jpg', { type: 'image/jpeg' });
    service.uploadCoverPhoto(cover, 'following').subscribe();

    const uploadRequest = httpController.expectOne(`${environment.base_url}/users/upload-cover`);
    expect(uploadRequest.request.method).toBe('PUT');
    expect(uploadRequest.request.body.get('cover')).toBe(cover);
    expect(uploadRequest.request.body.get('privacy')).toBe('following');
    uploadRequest.flush({ success: true });

    service.deleteCoverPhoto().subscribe();
    const deleteRequest = httpController.expectOne(`${environment.base_url}/users/cover`);
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush({ success: true });
  });

  it('loads a public user profile and paginated posts', () => {
    service.getUserProfile('user-2').subscribe();
    const profileRequest = httpController.expectOne(`${environment.base_url}/users/user-2/profile`);
    expect(profileRequest.request.method).toBe('GET');
    profileRequest.flush({
      success: true,
      message: 'success',
      data: { user: {}, isFollowing: false },
    });

    service.getUserPosts('user-2', 2, 6).subscribe();
    const postsRequest = httpController.expectOne(
      `${environment.base_url}/users/user-2/posts?page=2&limit=6`,
    );
    expect(postsRequest.request.method).toBe('GET');
    postsRequest.flush({
      success: true,
      message: 'success',
      data: { posts: [] },
    });
  });

  it('updates the cached authenticated user following count', () => {
    service.currentUser.set({
      _id: 'user-1',
      name: 'Ahmed Reda',
      username: 'ahmed_reda',
      email: 'ahmed@example.com',
      photo: '',
      followingCount: 3,
    });

    service.adjustFollowingCount(-1);

    expect(service.currentUser()?.followingCount).toBe(2);

    service.adjustFollowingCount(-5);

    expect(service.currentUser()?.followingCount).toBe(0);
  });

  it('changes the authenticated user password', () => {
    service
      .changePassword({
        password: 'OldPassword1!',
        newPassword: 'NewPassword2@',
      })
      .subscribe((response) => {
        expect(response.message).toBe('Password changed successfully');
      });

    const request = httpController.expectOne(`${environment.base_url}/users/change-password`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      password: 'OldPassword1!',
      newPassword: 'NewPassword2@',
    });
    request.flush({
      success: true,
      message: 'Password changed successfully',
    });
  });
});
