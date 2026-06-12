import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { routes } from '../../app.routes';
import { AuthService } from '../../core/auth/services/auth.service';
import { SuggestionResponse, UserSuggestionData } from '../../core/models/suggestion.interface';
import { SuggestionsService } from '../../core/services/suggestions/suggestions.service';
import { SuggestionsComponent } from './suggestions.component';

describe('SuggestionsComponent', () => {
  let component: SuggestionsComponent;
  let fixture: ComponentFixture<SuggestionsComponent>;
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
      imports: [SuggestionsComponent],
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

    fixture = TestBed.createComponent(SuggestionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('registers the suggestions route under the main layout', async () => {
    const mainLayoutRoute = routes.find((route) =>
      route.children?.some((child) => child.path === 'feed'),
    );
    const suggestionsRoute = mainLayoutRoute?.children?.find(
      (child) => child.path === 'suggestions',
    );

    expect(await suggestionsRoute?.loadComponent?.()).toBe(SuggestionsComponent);
  });

  it('loads twenty suggestions and renders the full page design', () => {
    expect(suggestionsService.getFollowSuggestions).toHaveBeenCalledWith(20);
    expect(fixture.nativeElement.textContent).toContain('All Suggested Friends');
    expect(fixture.nativeElement.querySelector('a[href="/feed"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('app-suggestion-card')).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('[data-suggestions-count]').textContent.trim()).toBe(
      '3',
    );
  });

  it('filters by name or username and updates the displayed count', () => {
    const search = fixture.nativeElement.querySelector(
      '[data-suggestions-search]',
    ) as HTMLInputElement;

    search.value = 'omar';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-suggestion-card')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Omar Khaled');
    expect(fixture.nativeElement.querySelector('[data-suggestions-count]').textContent.trim()).toBe(
      '1',
    );

    search.value = 'missing';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No suggestions match your search');
    expect(fixture.nativeElement.querySelector('[data-suggestions-count]').textContent.trim()).toBe(
      '0',
    );
  });

  it('shows loading skeletons while the request is pending', () => {
    const request = new Subject<SuggestionResponse>();
    suggestionsService.getFollowSuggestions.mockReturnValue(request);

    component.loadSuggestions();
    fixture.detectChanges();

    expect(component.isLoading()).toBe(true);
    expect(
      fixture.nativeElement.querySelectorAll('[data-suggestion-skeleton]').length,
    ).toBeGreaterThan(0);
  });

  it('shows a retryable error and an empty state', () => {
    suggestionsService.getFollowSuggestions.mockReturnValue(throwError(() => new Error('failed')));

    component.loadSuggestions();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("We couldn't load suggestions");
    expect(fixture.nativeElement.querySelector('[data-suggestions-retry]')).toBeTruthy();

    suggestionsService.getFollowSuggestions.mockReturnValue(of(createResponse([])));
    component.loadSuggestions();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No suggestions available');
  });

  it('removes a followed user and refills the current suggestion limit', () => {
    const replacement = createSuggestion('user-5', 'Youssef Samir', 'youssef');
    suggestionsService.getFollowSuggestions.mockReturnValue(
      of(createResponse([...suggestions.slice(1), replacement])),
    );

    component.onSuggestionFollowed('user-2');

    expect(suggestionsService.getFollowSuggestions).toHaveBeenLastCalledWith(20);
    expect(component.suggestions().map((item) => item._id)).toEqual(['user-3', 'user-4', 'user-5']);
  });

  it('loads twenty more users and appends only new suggestions', () => {
    const firstTwenty = createSuggestions(1, 20);
    const nextTwenty = createSuggestions(21, 20);
    component.suggestions.set(firstTwenty);
    component.hasMore.set(true);
    suggestionsService.getFollowSuggestions.mockReturnValue(
      of(createResponse([...firstTwenty, ...nextTwenty], 40)),
    );

    component.loadMoreSuggestions();

    expect(suggestionsService.getFollowSuggestions).toHaveBeenLastCalledWith(40);
    expect(component.suggestions()).toHaveLength(40);
    expect(new Set(component.suggestions().map((item) => item._id)).size).toBe(40);
    expect(component.currentLimit()).toBe(40);
    expect(component.hasMore()).toBe(true);
  });

  it('shows Load more while more users are available and hides it at the end', () => {
    component.suggestions.set(createSuggestions(1, 20));
    component.hasMore.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-load-more-users]')).toBeTruthy();

    suggestionsService.getFollowSuggestions.mockReturnValue(
      of(createResponse(createSuggestions(1, 25), 40)),
    );
    fixture.nativeElement.querySelector('[data-load-more-users]').click();
    fixture.detectChanges();

    expect(component.suggestions()).toHaveLength(25);
    expect(component.hasMore()).toBe(false);
    expect(fixture.nativeElement.querySelector('[data-load-more-users]')).toBeFalsy();
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
  {
    _id: 'user-4',
    name: 'Sara Adel',
    username: 'sara',
    photo: '/assets/images/default-profile.png',
    mutualFollowersCount: 1,
    followersCount: 6,
  },
];

function createResponse(items: UserSuggestionData[], limit = 20): SuggestionResponse {
  return {
    success: true,
    message: 'success',
    data: { suggestions: items },
    meta: {
      pagination: {
        currentPage: 1,
        limit,
        total: items.length,
        numberOfPages: 1,
        nextPage: 0,
      },
    },
  };
}

function createSuggestions(start: number, count: number): UserSuggestionData[] {
  return Array.from({ length: count }, (_, index) => {
    const number = start + index;
    return createSuggestion(`user-${number}`, `User ${number}`, `user_${number}`);
  });
}

function createSuggestion(id: string, name: string, username: string): UserSuggestionData {
  return {
    _id: id,
    name,
    username,
    photo: '/assets/images/default-profile.png',
    mutualFollowersCount: 0,
    followersCount: 1,
  };
}
