import {
  Component,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { PostsService } from '../../services/posts.service';
import { SuggestedFriendsComponent } from '../suggested-friends/suggested-friends.component';
import { SinglePostComponent } from '../../../../shared/components/single-post/single-post.component';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { FeedPostData } from '../../model/feed.interface';

@Component({
  selector: 'app-create-post',
  imports: [SuggestedFriendsComponent, SinglePostComponent, ReactiveFormsModule],
  templateUrl: './create-post.component.html',
  styleUrl: './create-post.component.css',
})
export class CreatePostComponent implements AfterViewInit, OnDestroy {
  private readonly postsService = inject(PostsService);

  readonly isSuggestedFriendsMobileOpen = signal<boolean>(false);
  readonly posts = this.postsService.posts;
  readonly currentFilter = this.postsService.currentFilter;
  readonly isPageLoading = this.postsService.isPageLoading;
  readonly isLoading = this.postsService.isLoading;
  readonly hasMorePages = computed(
    () => this.postsService.currentPage() < this.postsService.totalPages(),
  );
  readonly imagePreview = signal<string | null>(null);
  readonly isCreatingPost = signal<boolean>(false);
  readonly optimisticPosts = signal<FeedPostData[]>([]);
  readonly combinedPosts = computed(() => [
    ...this.optimisticPosts(),
    ...this.posts(),
  ]);

  @ViewChild('infiniteScrollAnchor') scrollAnchor!: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;
  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.postsService.loadNextPage();
        }
      },
      {
        rootMargin: '150px', // trigger 150px before entering viewport
      },
    );

    if (this.scrollAnchor) {
      this.observer.observe(this.scrollAnchor.nativeElement);
    }
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  toggleSuggestedFriendsMobile(): void {
    this.isSuggestedFriendsMobileOpen.update((val) => !val);
  }

  changeFilter(filter: string): void {
    this.postsService.changeFilter(filter);
  }

  // 1. prepare content [body]
  postContent: FormControl = new FormControl('');
  postPrivacy: FormControl = new FormControl('public');

  // 2. prepare File
  uploadedFile: File | null = null;

  fileUploaded(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input?.files && input.files[0]) {
      this.uploadedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview.set(reader.result as string);
      };
      reader.readAsDataURL(this.uploadedFile);
    }
  }

  removeImage(): void {
    this.imagePreview.set(null);
    this.uploadedFile = null;
    if (this.fileInputRef) {
      this.fileInputRef.nativeElement.value = '';
    }
  }

  onSubmitForm(e: SubmitEvent): void {
    e.preventDefault();

    // Prevent submitting empty post (neither text nor image)
    const bodyText = (this.postContent.value || '').trim();
    if (!bodyText && !this.uploadedFile) {
      return;
    }

    this.isCreatingPost.set(true);

    // Decode user details from JWT token
    let currentUserId = '';
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        currentUserId = decoded.user || decoded.id || decoded._id || '';
      }
    } catch {}

    const tempId = `temp-${Date.now()}`;
    const optimisticPost: FeedPostData = {
      id: tempId,
      _id: tempId,
      body: bodyText,
      image: this.imagePreview() || '',
      privacy: this.postPrivacy.value || 'public',
      createdAt: new Date().toISOString(),
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      bookmarked: false,
      isShare: false,
      likes: [],
      sharedPost: null,
      topComment: null,
      relativeTime: 'Just now',
      user: {
        _id: currentUserId,
        name: 'Ahmed Reda', // Matches local mockup user name
        username: 'ahmedreda',
        photo: '/assets/images/default-profile.png',
      },
      isOptimisticPending: true,
    };

    // Prepend optimistic post immediately
    this.optimisticPosts.update((prev) => [optimisticPost, ...prev]);

    // Save previous form states for rollback/recovery
    const prevBody = this.postContent.value;
    const prevPrivacy = this.postPrivacy.value;
    const prevFile = this.uploadedFile;
    const prevPreview = this.imagePreview();

    // Clear form inputs immediately
    this.postContent.reset('');
    this.postPrivacy.reset('public');
    this.removeImage();

    const formData: FormData = new FormData();
    if (bodyText) {
      formData.append('body', bodyText);
    }
    if (prevFile) {
      formData.append('image', prevFile);
    }
    formData.append('privacy', prevPrivacy || 'public');

    this.postsService.createPost(formData).subscribe({
      next: (res) => {
        if (res.success) {
          // Remove optimistic post
          this.optimisticPosts.update((prev) => prev.filter((p) => p.id !== tempId));
          this.isCreatingPost.set(false);
          // Reload the feed to display the real post from the server
          this.postsService.changeFilter(this.postsService.currentFilter());
        }
      },
      error: () => {
        // Rollback optimistic post and restore form state
        this.optimisticPosts.update((prev) => prev.filter((p) => p.id !== tempId));
        this.isCreatingPost.set(false);

        // Restore values
        this.postContent.setValue(prevBody);
        this.postPrivacy.setValue(prevPrivacy);
        this.uploadedFile = prevFile;
        this.imagePreview.set(prevPreview);
      },
    });
  }
}
