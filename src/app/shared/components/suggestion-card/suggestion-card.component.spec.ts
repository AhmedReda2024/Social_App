import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/services/auth.service';
import { UserSuggestionData } from '../../../core/models/suggestion.interface';
import { SuggestionsService } from '../../../core/services/suggestions/suggestions.service';
import { SuggestionCardComponent } from './suggestion-card.component';

describe('SuggestionCardComponent', () => {
  let component: SuggestionCardComponent;
  let fixture: ComponentFixture<SuggestionCardComponent>;
  let suggestionsService: {
    followAndUnfollowUser: ReturnType<typeof vi.fn>;
  };
  let authService: {
    currentUser: ReturnType<typeof signal>;
    adjustFollowingCount: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    suggestionsService = {
      followAndUnfollowUser: vi.fn(),
    };
    authService = {
      currentUser: signal({
        _id: 'current-user',
        name: 'Current User',
        username: 'current',
        email: 'current@example.com',
        photo: '',
        followingCount: 3,
      }),
      adjustFollowingCount: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SuggestionCardComponent],
      providers: [
        provideRouter([]),
        { provide: SuggestionsService, useValue: suggestionsService },
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SuggestionCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('suggestion', createSuggestion());
    fixture.componentRef.setInput('variant', 'full');
    fixture.detectChanges();
  });

  it('renders suggestion details and profile links', () => {
    const profileLinks = fixture.nativeElement.querySelectorAll('a[href="/profile/user-2"]');

    expect(profileLinks.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Mona Ali');
    expect(fixture.nativeElement.textContent).toContain('@mona');
    expect(fixture.nativeElement.textContent).toContain('4 followers');
  });

  it('updates follow state and counts immediately while preventing duplicate requests', () => {
    const request = new Subject<{
      success: boolean;
      message: string;
      data: { following: boolean };
    }>();
    suggestionsService.followAndUnfollowUser.mockReturnValue(request);

    component.toggleFollow();
    component.toggleFollow();
    fixture.detectChanges();

    expect(component.isFollowing()).toBe(true);
    expect(component.followersCount()).toBe(5);
    expect(component.isFollowPending()).toBe(true);
    expect(suggestionsService.followAndUnfollowUser).toHaveBeenCalledTimes(1);
    expect(suggestionsService.followAndUnfollowUser).toHaveBeenCalledWith('user-2');
    expect(authService.adjustFollowingCount).toHaveBeenCalledWith(1);
    expect(fixture.nativeElement.textContent).toContain('Following');
    expect(fixture.nativeElement.querySelector('[data-follow-action]').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.fa-circle-notch')).toBeTruthy();

    request.next({ success: true, message: 'success', data: { following: true } });
    request.complete();
  });

  it('emits the followed user only after the server confirms the follow', () => {
    const request = new Subject<any>();
    const followedSpy = vi.fn();
    component.followed.subscribe(followedSpy);
    suggestionsService.followAndUnfollowUser.mockReturnValue(request);

    component.toggleFollow();

    expect(followedSpy).not.toHaveBeenCalled();

    request.next({ success: true, message: 'success', data: { following: true } });
    request.complete();

    expect(followedSpy).toHaveBeenCalledWith('user-2');
  });

  it('keeps the row and supports immediate unfollow', () => {
    const followRequest = new Subject<any>();
    suggestionsService.followAndUnfollowUser.mockReturnValue(followRequest);
    component.toggleFollow();
    followRequest.next({ success: true, message: 'success', data: { following: true } });
    followRequest.complete();

    const unfollowRequest = new Subject<any>();
    suggestionsService.followAndUnfollowUser.mockReturnValue(unfollowRequest);
    component.toggleFollow();
    fixture.detectChanges();

    expect(component.isFollowing()).toBe(false);
    expect(component.followersCount()).toBe(4);
    expect(authService.adjustFollowingCount).toHaveBeenLastCalledWith(-1);
    expect(fixture.nativeElement.textContent).toContain('Follow');
    expect(fixture.nativeElement.textContent).toContain('Mona Ali');
  });

  it('reconciles an unexpected server state', () => {
    const request = new Subject<any>();
    const followedSpy = vi.fn();
    component.followed.subscribe(followedSpy);
    suggestionsService.followAndUnfollowUser.mockReturnValue(request);

    component.toggleFollow();
    request.next({ success: true, message: 'success', data: { following: false } });
    request.complete();

    expect(component.isFollowing()).toBe(false);
    expect(component.followersCount()).toBe(4);
    expect(authService.adjustFollowingCount).toHaveBeenNthCalledWith(1, 1);
    expect(authService.adjustFollowingCount).toHaveBeenNthCalledWith(2, -1);
    expect(followedSpy).not.toHaveBeenCalled();
  });

  it('rolls back follow state and counts after failure', () => {
    suggestionsService.followAndUnfollowUser.mockReturnValue(throwError(() => new Error('failed')));

    component.toggleFollow();

    expect(component.isFollowing()).toBe(false);
    expect(component.followersCount()).toBe(4);
    expect(component.isFollowPending()).toBe(false);
    expect(authService.adjustFollowingCount).toHaveBeenNthCalledWith(1, 1);
    expect(authService.adjustFollowingCount).toHaveBeenNthCalledWith(2, -1);
  });

  function createSuggestion(overrides: Partial<UserSuggestionData> = {}): UserSuggestionData {
    return {
      _id: 'user-2',
      name: 'Mona Ali',
      username: 'mona',
      photo: '/assets/images/default-profile.png',
      mutualFollowersCount: 2,
      followersCount: 4,
      ...overrides,
    };
  }
});
