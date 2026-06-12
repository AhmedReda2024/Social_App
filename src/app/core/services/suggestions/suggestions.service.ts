import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { FollowToggleResponse, SuggestionResponse } from '../../models/suggestion.interface';

@Injectable({
  providedIn: 'root',
})
export class SuggestionsService {
  private readonly httpClient = inject(HttpClient);

  getFollowSuggestions(limit: number = 5): Observable<SuggestionResponse> {
    return this.httpClient.get<SuggestionResponse>(
      `${environment.base_url}/users/suggestions?limit=${limit}`,
    );
  }

  followAndUnfollowUser(userId: string): Observable<FollowToggleResponse> {
    return this.httpClient.put<FollowToggleResponse>(
      `${environment.base_url}/users/${userId}/follow`,
      null,
    );
  }
}
