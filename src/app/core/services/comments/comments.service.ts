import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CommentsService {
  private readonly httpClient = inject(HttpClient);

  getPostComments(postId: string, page: number = 1, limit: number = 10): Observable<any> {
    return this.httpClient.get<any>(
      `${environment.base_url}/posts/${postId}/comments?page=${page}&limit=${limit}`,
    );
  }

  getCommentsReplies(
    postId: string,
    commentId: string,
    page: number = 1,
    limit: number = 10,
  ): Observable<any> {
    return this.httpClient.get<any>(
      `${environment.base_url}/posts/${postId}/comments/${commentId}/replies?page=${page}&limit=${limit}`,
    );
  }

  addComment(postId: string, data: FormData): Observable<any> {
    return this.httpClient.post<any>(`${environment.base_url}/posts/${postId}/comments`, data);
  }

  updateComment(postId: string, commentId: string, data: FormData): Observable<any> {
    return this.httpClient.put<any>(
      `${environment.base_url}/posts/${postId}/comments/${commentId}`,
      data,
    );
  }

  deleteComment(postId: string, commentId: string): Observable<any> {
    return this.httpClient.delete<any>(
      `${environment.base_url}/posts/${postId}/comments/${commentId}`,
    );
  }

  toggleLikeComment(postId: string, commentId: string): Observable<any> {
    return this.httpClient.put<any>(
      `${environment.base_url}/posts/${postId}/comments/${commentId}/like`,
      null,
    );
  }

  addReply(postId: string, commentId: string, data: FormData): Observable<any> {
    return this.httpClient.post<any>(
      `${environment.base_url}/posts/${postId}/comments/${commentId}/replies`,
      data,
    );
  }
}
