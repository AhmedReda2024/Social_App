import {
  Component,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { FeedUser, SharePostRequest } from '../../../features/feed/model/feed.interface';
import { PostsService } from '../../../features/feed/services/posts.service';

export interface SharePostPreview {
  id: string;
  body?: string;
  image?: string;
  user: FeedUser;
}

@Component({
  selector: 'app-share-post-modal',
  templateUrl: './share-post-modal.component.html',
  styleUrl: './share-post-modal.component.css',
})
export class SharePostModalComponent implements OnInit, OnDestroy {
  @Input({ required: true }) post!: SharePostPreview;
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly shared = new EventEmitter<void>();

  private readonly postsService = inject(PostsService);
  private previousBodyOverflow = '';

  readonly message = signal('');
  readonly isSharing = signal(false);

  ngOnInit(): void {
    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    document.body.style.overflow = this.previousBodyOverflow;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  close(): void {
    if (!this.isSharing()) {
      this.closed.emit();
    }
  }

  onBackdropClick(_event: MouseEvent): void {
    this.close();
  }

  submit(): void {
    if (this.isSharing()) {
      return;
    }

    const body = this.message().trim();
    const request: SharePostRequest = body ? { body } : {};

    this.isSharing.set(true);
    this.postsService.sharePost(this.post.id, request).subscribe({
      next: () => {
        this.isSharing.set(false);
        this.message.set('');
        this.shared.emit();
      },
      error: () => {
        this.isSharing.set(false);
      },
    });
  }
}
