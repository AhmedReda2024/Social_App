import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, shareReplay, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ProfileData,
  ProfileResponse,
  PublicProfileResponse,
} from '../../models/profile.interface';
import { PostsListResponse } from '../../../features/feed/model/feed.interface';
import {
  ChangePasswordRequest,
  ChangePasswordResponse,
} from '../../models/change-password.interface';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly httpClient = inject(HttpClient);
  private profileRequest$?: Observable<ProfileResponse>;

  readonly currentUser = signal<ProfileData | null>(null);

  signUp(registerDto: object): Observable<any> {
    return this.httpClient.post(`${environment.base_url}/users/signup`, registerDto);
  }

  signIn(loginDto: object): Observable<any> {
    return this.httpClient.post(`${environment.base_url}/users/signin`, loginDto);
  }

  getProfileData(): Observable<ProfileResponse> {
    return this.loadProfile();
  }

  loadProfile(force = false): Observable<ProfileResponse> {
    if (force || !this.profileRequest$) {
      this.profileRequest$ = this.httpClient
        .get<ProfileResponse>(`${environment.base_url}/users/profile-data`)
        .pipe(
          tap((response) => this.currentUser.set(this.extractProfile(response))),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }

    return this.profileRequest$;
  }

  uploadProfilePhoto(photo: Blob, privacy: string): Observable<unknown> {
    const formData = new FormData();
    formData.append('photo', photo, 'profile-photo.jpg');
    formData.append('privacy', privacy);

    return this.httpClient.put(`${environment.base_url}/users/upload-photo`, formData);
  }

  uploadCoverPhoto(cover: File, privacy: string): Observable<unknown> {
    const formData = new FormData();
    formData.append('cover', cover);
    formData.append('privacy', privacy);

    return this.httpClient.put(`${environment.base_url}/users/upload-cover`, formData);
  }

  deleteCoverPhoto(): Observable<unknown> {
    return this.httpClient.delete(`${environment.base_url}/users/cover`);
  }

  clearCurrentUser(): void {
    this.currentUser.set(null);
    this.profileRequest$ = undefined;
  }

  adjustFollowingCount(delta: number): void {
    this.currentUser.update((user) => {
      if (!user) {
        return user;
      }

      const currentCount = user.followingCount ?? user.following?.length ?? 0;
      return {
        ...user,
        followingCount: Math.max(0, currentCount + delta),
      };
    });
  }

  private extractProfile(response: ProfileResponse): ProfileData {
    return 'user' in response.data ? response.data.user : response.data;
  }

  getUserProfile(userId: string): Observable<PublicProfileResponse> {
    return this.httpClient.get<PublicProfileResponse>(
      `${environment.base_url}/users/${userId}/profile`,
    );
  }

  getUserPosts(userId: string, page = 1, limit = 10): Observable<PostsListResponse> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.httpClient.get<PostsListResponse>(`${environment.base_url}/users/${userId}/posts`, {
      params,
    });
  }

  changePassword(request: ChangePasswordRequest): Observable<ChangePasswordResponse> {
    return this.httpClient.patch<ChangePasswordResponse>(
      `${environment.base_url}/users/change-password`,
      request,
    );
  }
}
