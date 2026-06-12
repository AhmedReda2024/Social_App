import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { map } from 'rxjs';
import { IPostData } from '../../core/models/ipost-data.interface';
import { PostsService } from '../feed/services/posts.service';
import { SinglePostComponent } from '../../shared/components/single-post/single-post.component';
import { Location } from '@angular/common';

@Component({
  selector: 'app-post-details',
  imports: [SinglePostComponent],
  templateUrl: './post-details.component.html',
  styleUrl: './post-details.component.css',
})
export class PostDetailsComponent implements OnInit {
  private readonly postsService = inject(PostsService);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);

  postData = signal<IPostData>({} as IPostData);
  isLoading = signal<boolean>(true);
  isError = signal<boolean>(false);

  ngOnInit(): void {
    this.getPostDetails();
  }

  goBack(): void {
    this.location.back();
  }

  onPostDeleted(): void {
    this.postData.set({} as IPostData);
    this.isLoading.set(false);
    this.isError.set(true);
  }

  private getCurrentUserId(): string {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        return decoded.user || decoded.id || decoded._id || '';
      }
    } catch {}
    return '';
  }

  getPostDetails(): void {
    this.route.paramMap.subscribe((params: ParamMap) => {
      const postId = params.get('id');
      if (!postId) {
        this.isError.set(true);
        this.isLoading.set(false);
        return;
      }

      this.isLoading.set(true);
      this.isError.set(false);

      this.postsService
        .getSinglePost(postId)
        .pipe(map((res) => res.data.post))
        .subscribe({
          next: (res) => {
            const userId = this.getCurrentUserId();
            const isLiked =
              res.likes?.some((like: any) => {
                if (typeof like === 'string') return like === userId;
                return (like._id || like.id) === userId;
              }) || !!res.isLiked;

            this.postData.set({
              ...res,
              isLiked: isLiked,
              relativeTime: this.postsService.getRelativeTime(res.createdAt),
            } as any);
            this.isLoading.set(false);
          },
          error: () => {
            this.isError.set(true);
            this.isLoading.set(false);
          },
        });
    });
  }
}
