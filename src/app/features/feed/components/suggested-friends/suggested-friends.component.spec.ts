import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import {
  SuggestionResponse,
  UserSuggestionData,
} from '../../../../core/models/suggestion.interface';
import { SuggestionsService } from '../../../../core/services/suggestions/suggestions.service';
import { SuggestedFriendsComponent } from './suggested-friends.component';

describe('SuggestedFriendsComponent', () => {
  let component: SuggestedFriendsComponent;
  let fixture: ComponentFixture<SuggestedFriendsComponent>;
  let suggestionsService: {
    getFollowSuggestions: ReturnType<typeof vi.fn>;
    followAndUnfollowUser: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    suggestionsService = {
      getFollowSuggestions: vi.fn(() => of(createResponse(suggestions))),
      followAndUnfollowUser: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SuggestedFriendsComponent],
      providers: [
        provideRouter([]),
        { provide: SuggestionsService, useValue: suggestionsService },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal(null),
            adjustFollowingCount: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SuggestedFriendsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('loads five suggestions and links View more to the full page', () => {
    expect(suggestionsService.getFollowSuggestions).toHaveBeenCalledWith(5);
    expect(fixture.nativeElement.querySelectorAll('app-suggestion-card')).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('[data-widget-count]').textContent.trim()).toBe('2');
    expect(fixture.nativeElement.querySelector('a[href="/suggestions"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('a[href="/profile/user-2"]')).toBeTruthy();
  });

  it('filters the compact list by name or username', () => {
    const search = fixture.nativeElement.querySelector('[data-widget-search]') as HTMLInputElement;

    search.value = 'omar';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-suggestion-card')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Omar Khaled');
    expect(fixture.nativeElement.querySelector('[data-widget-count]').textContent.trim()).toBe('1');
  });

  it('shows loading, retryable error, and empty states', () => {
    const request = new Subject<SuggestionResponse>();
    suggestionsService.getFollowSuggestions.mockReturnValue(request);

    component.getSuggestedFriends();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[data-widget-skeleton]').length).toBeGreaterThan(
      0,
    );

    suggestionsService.getFollowSuggestions.mockReturnValue(throwError(() => new Error('failed')));
    component.getSuggestedFriends();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("We couldn't load suggestions");
    expect(fixture.nativeElement.querySelector('[data-widget-retry]')).toBeTruthy();

    suggestionsService.getFollowSuggestions.mockReturnValue(of(createResponse([])));
    component.getSuggestedFriends();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No suggestions right now');
  });

  it('removes a followed user and requests a replacement for the compact list', () => {
    const replacement: UserSuggestionData = {
      _id: 'user-4',
      name: 'Sara Adel',
      username: 'sara',
      photo: '/assets/images/default-profile.png',
      mutualFollowersCount: 1,
      followersCount: 6,
    };
    suggestionsService.getFollowSuggestions.mockReturnValue(
      of(createResponse([suggestions[1], replacement])),
    );

    component.onSuggestionFollowed('user-2');

    expect(suggestionsService.getFollowSuggestions).toHaveBeenLastCalledWith(5);
    expect(component.suggestedFriends().map((item) => item._id)).toEqual(['user-3', 'user-4']);
  });
});

const suggestions: UserSuggestionData[] = [
  {
    _id: 'user-2',
    name: 'Mona Ali',
    username: 'mona',
    photo: '/assets/images/default-profile.png',
    mutualFollowersCount: 2,
    followersCount: 4,
  },
  {
    _id: 'user-3',
    name: 'Omar Khaled',
    username: 'omar_k',
    photo: '/assets/images/default-profile.png',
    mutualFollowersCount: 0,
    followersCount: 8,
  },
];

function createResponse(items: UserSuggestionData[]): SuggestionResponse {
  return {
    success: true,
    message: 'success',
    data: { suggestions: items },
    meta: {
      pagination: {
        currentPage: 1,
        limit: 5,
        total: items.length,
        numberOfPages: 1,
        nextPage: 0,
      },
    },
  };
}
