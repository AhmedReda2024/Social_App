import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { SuggestionsService } from './suggestions.service';

describe('SuggestionsService', () => {
  let service: SuggestionsService;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SuggestionsService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  it('requests follow suggestions with the supplied limit', () => {
    service.getFollowSuggestions(20).subscribe();

    const request = httpController.expectOne(`${environment.base_url}/users/suggestions?limit=20`);
    expect(request.request.method).toBe('GET');
    request.flush({
      success: true,
      message: 'success',
      data: { suggestions: [] },
      meta: {
        pagination: {
          currentPage: 1,
          limit: 20,
          total: 0,
          numberOfPages: 1,
          nextPage: 0,
        },
      },
    });
  });

  it('toggles follow state and returns the server state', () => {
    let following: boolean | undefined;
    service.followAndUnfollowUser('user-2').subscribe((response) => {
      following = response.data.following;
    });

    const request = httpController.expectOne(`${environment.base_url}/users/user-2/follow`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toBeNull();
    request.flush({
      success: true,
      message: 'success',
      data: { following: true },
    });

    expect(following).toBe(true);
  });
});
