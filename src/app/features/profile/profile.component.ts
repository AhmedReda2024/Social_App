import {
  Component,
  computed,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth.service';
import { ProfileData } from '../../core/models/profile.interface';
import { FeedPostData, PostsListResponse } from '../feed/model/feed.interface';
import { PostsService } from '../feed/services/posts.service';

type ProfileTab = 'posts' | 'saved';
type PostPrivacy = 'public' | 'following' | 'only_me';
type LightboxImage = { src: string; alt: string };

interface CropImage {
  src: string;
  width: number;
  height: number;
}

@Component({
  selector: 'app-profile',
  imports: [RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly postsService = inject(PostsService);
  private readonly pageSize = 10;
  private readonly cropSize = 320;
  private avatarFile: File | null = null;
  private coverFile: File | null = null;
  private avatarObjectUrl: string | null = null;
  private coverObjectUrl: string | null = null;
  private dragStart: { x: number; y: number; offsetX: number; offsetY: number } | null = null;

  readonly profile = this.authService.currentUser;
  readonly activeTab = signal<ProfileTab>('posts');
  readonly myPosts = signal<FeedPostData[]>([]);
  readonly savedPosts = signal<FeedPostData[]>([]);
  readonly myPostsPage = signal(1);
  readonly myPostsPages = signal(1);
  readonly savedPostsPage = signal(1);
  readonly savedPostsPages = signal(1);
  readonly myPostsTotal = signal(0);
  readonly savedPostsTotal = signal(0);
  readonly isProfileLoading = signal(true);
  readonly isPostsLoading = signal(true);
  readonly isLoadingMore = signal(false);
  readonly profileError = signal(false);
  readonly postsError = signal(false);
  readonly savedPostsLoaded = signal(false);

  readonly cropImage = signal<CropImage | null>(null);
  readonly cropZoom = signal(1);
  readonly cropOffset = signal({ x: 0, y: 0 });
  readonly isCropDragging = signal(false);
  readonly avatarPrivacy = signal<PostPrivacy>('public');
  readonly coverPrivacy = signal<PostPrivacy>('public');
  readonly coverPreview = signal<string | null>(null);
  readonly lightboxImage = signal<LightboxImage | null>(null);
  readonly isCoverDialogOpen = signal(false);
  readonly isRemoveCoverDialogOpen = signal(false);
  readonly isSavingAvatar = signal(false);
  readonly isSavingCover = signal(false);
  readonly isRemovingCover = signal(false);
  readonly avatarError = signal<string | null>(null);
  readonly coverError = signal<string | null>(null);
  readonly removeCoverError = signal<string | null>(null);

  readonly displayedPosts = computed(() =>
    this.activeTab() === 'posts' ? this.myPosts() : this.savedPosts(),
  );
  readonly hasMorePosts = computed(() =>
    this.activeTab() === 'posts'
      ? this.myPostsPage() < this.myPostsPages()
      : this.savedPostsPage() < this.savedPostsPages(),
  );

  ngOnInit(): void {
    this.loadProfile();
    this.loadMyPosts();
  }

  ngOnDestroy(): void {
    this.revokeAvatarObjectUrl();
    this.revokeCoverObjectUrl();
    this.setPageScrollLocked(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isSavingAvatar() || this.isSavingCover() || this.isRemovingCover()) {
      return;
    }

    if (this.lightboxImage()) {
      this.closeLightbox();
    } else if (this.cropImage()) {
      this.closeAvatarEditor();
    } else if (this.isCoverDialogOpen()) {
      this.closeCoverDialog();
    } else if (this.isRemoveCoverDialogOpen()) {
      this.closeRemoveCoverDialog();
    }
  }

  changeTab(tab: ProfileTab): void {
    if (tab === this.activeTab()) {
      return;
    }

    this.activeTab.set(tab);
    this.postsError.set(false);

    if (tab === 'saved' && !this.savedPostsLoaded()) {
      this.loadSavedPosts();
    }
  }

  retryProfile(): void {
    this.loadProfile(true);
  }

  retryPosts(): void {
    this.activeTab() === 'posts' ? this.loadMyPosts() : this.loadSavedPosts();
  }

  postAuthorRoute(userId?: string): string[] {
    const currentUser = this.profile();
    const currentUserId = currentUser?._id || currentUser?.id;

    if (!userId || userId === currentUserId) {
      return ['/profile'];
    }

    return ['/profile', userId];
  }

  loadMore(): void {
    if (!this.hasMorePosts() || this.isLoadingMore()) {
      return;
    }

    if (this.activeTab() === 'posts') {
      this.loadMyPosts(this.myPostsPage() + 1, true);
    } else {
      this.loadSavedPosts(this.savedPostsPage() + 1, true);
    }
  }

  onAvatarError(event: Event): void {
    (event.target as HTMLImageElement).src = '/assets/images/default-profile.png';
  }

  coverBackground(cover?: string | null): string {
    const overlay = 'linear-gradient(180deg, rgb(15 23 42 / 15%), rgb(15 23 42 / 38%))';
    return cover
      ? `${overlay}, url("${cover.replaceAll('"', '\\"')}")`
      : 'radial-gradient(circle at 88% 18%, rgb(125 184 223 / 75%), transparent 36%), linear-gradient(115deg, #172238 0%, #244c77 55%, #4b82ad 100%)';
  }

  openLightbox(src: string, alt: string): void {
    if (!src) {
      return;
    }

    this.lightboxImage.set({ src, alt });
    this.syncScrollLock();
  }

  closeLightbox(): void {
    this.lightboxImage.set(null);
    this.syncScrollLock();
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    this.avatarError.set(null);

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.avatarError.set('Please select a valid image file.');
      return;
    }

    this.avatarFile = file;
    this.revokeAvatarObjectUrl();
    this.avatarObjectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      this.cropImage.set({
        src: this.avatarObjectUrl!,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      this.cropZoom.set(1);
      this.cropOffset.set({ x: 0, y: 0 });
      this.avatarPrivacy.set('public');
      this.syncScrollLock();
    };
    image.onerror = () => {
      this.closeAvatarEditor();
      this.avatarError.set('This image could not be opened. Please choose another image.');
    };
    image.src = this.avatarObjectUrl;
  }

  closeAvatarEditor(): void {
    if (this.isSavingAvatar()) {
      return;
    }

    this.avatarFile = null;
    this.cropImage.set(null);
    this.cropOffset.set({ x: 0, y: 0 });
    this.cropZoom.set(1);
    this.dragStart = null;
    this.isCropDragging.set(false);
    this.avatarError.set(null);
    this.revokeAvatarObjectUrl();
    this.syncScrollLock();
  }

  onCropPointerDown(event: PointerEvent): void {
    if (!this.cropImage() || this.isSavingAvatar()) {
      return;
    }

    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    const offset = this.cropOffset();
    this.dragStart = {
      x: event.clientX,
      y: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
    this.isCropDragging.set(true);
  }

  onCropPointerMove(event: PointerEvent): void {
    if (!this.dragStart || !this.isCropDragging()) {
      return;
    }

    this.cropOffset.set(
      this.clampCropOffset(
        this.dragStart.offsetX + event.clientX - this.dragStart.x,
        this.dragStart.offsetY + event.clientY - this.dragStart.y,
      ),
    );
  }

  onCropPointerEnd(event: PointerEvent): void {
    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
    this.dragStart = null;
    this.isCropDragging.set(false);
  }

  updateCropZoom(value: string): void {
    if (this.isSavingAvatar()) {
      return;
    }

    this.cropZoom.set(Number(value));
    const offset = this.cropOffset();
    this.cropOffset.set(this.clampCropOffset(offset.x, offset.y));
  }

  cropImageStyle(): Record<string, string> {
    const image = this.cropImage();
    if (!image) {
      return {};
    }

    const scale = this.getCropScale(image);
    const offset = this.cropOffset();
    return {
      width: `${image.width}px`,
      height: `${image.height}px`,
      maxWidth: 'none',
      maxHeight: 'none',
      transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
    };
  }

  saveAvatar(): void {
    if (!this.avatarFile || !this.cropImage() || this.isSavingAvatar()) {
      return;
    }

    this.avatarError.set(null);
    this.isSavingAvatar.set(true);
    this.createAvatarBlob()
      .then((blob) => {
        this.authService.uploadProfilePhoto(blob, this.avatarPrivacy()).subscribe({
          next: () => {
            this.finishMediaMutation();
            this.isSavingAvatar.set(false);
            this.closeAvatarEditor();
          },
          error: () => {
            this.isSavingAvatar.set(false);
            this.avatarError.set('We could not update your profile photo. Please try again.');
          },
        });
      })
      .catch(() => {
        this.isSavingAvatar.set(false);
        this.avatarError.set('We could not prepare this image. Please try another image.');
      });
  }

  onCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    this.coverError.set(null);

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.coverError.set('Please select a valid image file.');
      return;
    }

    this.coverFile = file;
    this.revokeCoverObjectUrl();
    this.coverObjectUrl = URL.createObjectURL(file);
    this.coverPreview.set(this.coverObjectUrl);
    this.coverPrivacy.set('public');
    this.isCoverDialogOpen.set(true);
    this.syncScrollLock();
  }

  closeCoverDialog(): void {
    if (this.isSavingCover()) {
      return;
    }

    this.coverFile = null;
    this.coverPreview.set(null);
    this.isCoverDialogOpen.set(false);
    this.coverError.set(null);
    this.revokeCoverObjectUrl();
    this.syncScrollLock();
  }

  saveCover(): void {
    if (!this.coverFile || this.isSavingCover()) {
      return;
    }

    this.coverError.set(null);
    this.isSavingCover.set(true);
    this.authService.uploadCoverPhoto(this.coverFile, this.coverPrivacy()).subscribe({
      next: () => {
        this.finishMediaMutation();
        this.isSavingCover.set(false);
        this.closeCoverDialog();
      },
      error: () => {
        this.isSavingCover.set(false);
        this.coverError.set('We could not update your cover photo. Please try again.');
      },
    });
  }

  openRemoveCoverDialog(): void {
    this.removeCoverError.set(null);
    this.isRemoveCoverDialogOpen.set(true);
    this.syncScrollLock();
  }

  closeRemoveCoverDialog(): void {
    if (this.isRemovingCover()) {
      return;
    }

    this.isRemoveCoverDialogOpen.set(false);
    this.removeCoverError.set(null);
    this.syncScrollLock();
  }

  removeCover(): void {
    if (this.isRemovingCover()) {
      return;
    }

    this.removeCoverError.set(null);
    this.isRemovingCover.set(true);
    this.authService.deleteCoverPhoto().subscribe({
      next: () => {
        this.isRemovingCover.set(false);
        this.isRemoveCoverDialogOpen.set(false);
        this.finishMediaMutation();
        this.syncScrollLock();
      },
      error: () => {
        this.isRemovingCover.set(false);
        this.removeCoverError.set('We could not remove your cover photo. Please try again.');
      },
    });
  }

  generatedPostLabel(post: FeedPostData): string | null {
    const body = post.body?.trim().toLowerCase();
    if (body === 'updated profile picture.') {
      return 'updated profile picture.';
    }
    if (body === 'updated cover photo.') {
      return 'updated cover photo.';
    }
    return null;
  }

  postPrivacyLabel(privacy: string): string {
    if (privacy === 'only_me') {
      return 'Only me';
    }
    if (privacy === 'following') {
      return 'Following';
    }
    return 'Public';
  }

  followersCount(profile: ProfileData): number {
    return profile.followersCount ?? profile.followers?.length ?? 0;
  }

  followingCount(profile: ProfileData): number {
    return profile.followingCount ?? profile.following?.length ?? 0;
  }

  formatPostDate(createdAt: string): string {
    if (!createdAt) {
      return '';
    }

    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }

  private loadProfile(force = false): void {
    this.isProfileLoading.set(true);
    this.profileError.set(false);

    this.authService.loadProfile(force).subscribe({
      next: () => this.isProfileLoading.set(false),
      error: () => {
        this.profileError.set(true);
        this.isProfileLoading.set(false);
      },
    });
  }

  private loadMyPosts(page = 1, append = false): void {
    this.setPostsLoading(append);
    this.postsError.set(false);

    this.postsService.getMyPosts(page, this.pageSize).subscribe({
      next: (response) => {
        const posts = this.postsService.mapPosts(response);
        this.myPosts.set(append ? this.mergePosts(this.myPosts(), posts) : posts);
        this.updatePagination(response, 'posts', page);
        this.finishPostsLoading();
      },
      error: () => {
        this.postsError.set(true);
        this.finishPostsLoading();
      },
    });
  }

  private loadSavedPosts(page = 1, append = false): void {
    this.setPostsLoading(append);
    this.postsError.set(false);

    this.postsService.getSavedPosts(page, this.pageSize).subscribe({
      next: (response) => {
        const posts = this.postsService.mapPosts(response, true);
        this.savedPosts.set(append ? this.mergePosts(this.savedPosts(), posts) : posts);
        this.savedPostsLoaded.set(true);
        this.updatePagination(response, 'saved', page);
        this.finishPostsLoading();
      },
      error: () => {
        this.postsError.set(true);
        this.finishPostsLoading();
      },
    });
  }

  private finishMediaMutation(): void {
    this.authService.loadProfile(true).subscribe({
      next: () => undefined,
      error: () => undefined,
    });
    this.loadMyPosts();
    this.postsService.changeFilter(this.postsService.currentFilter());
  }

  private createAvatarBlob(): Promise<Blob> {
    const imageData = this.cropImage();
    if (!imageData) {
      return Promise.reject(new Error('No crop image'));
    }

    return new Promise((resolve, reject) => {
      const source = new Image();
      source.onload = () => {
        const scale = this.getCropScale(imageData);
        const sourceSize = this.cropSize / scale;
        const offset = this.cropOffset();
        const sourceX = (imageData.width - sourceSize) / 2 - offset.x / scale;
        const sourceY = (imageData.height - sourceSize) / 2 - offset.y / scale;
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1080;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Canvas unavailable'));
          return;
        }

        context.drawImage(
          source,
          sourceX,
          sourceY,
          sourceSize,
          sourceSize,
          0,
          0,
          canvas.width,
          canvas.height,
        );
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Blob creation failed'))),
          'image/jpeg',
          0.9,
        );
      };
      source.onerror = () => reject(new Error('Image unavailable'));
      source.src = imageData.src;
    });
  }

  private getCropScale(image: CropImage): number {
    return Math.max(this.cropSize / image.width, this.cropSize / image.height) * this.cropZoom();
  }

  private clampCropOffset(x: number, y: number): { x: number; y: number } {
    const image = this.cropImage();
    if (!image) {
      return { x: 0, y: 0 };
    }

    const scale = this.getCropScale(image);
    const maxX = Math.max(0, (image.width * scale - this.cropSize) / 2);
    const maxY = Math.max(0, (image.height * scale - this.cropSize) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  }

  private updatePagination(
    response: PostsListResponse,
    tab: ProfileTab,
    requestedPage: number,
  ): void {
    const pagination = response.meta?.pagination;
    const currentPage = pagination?.currentPage ?? requestedPage;
    const numberOfPages = pagination?.numberOfPages ?? 1;
    const total = pagination?.total;

    if (tab === 'posts') {
      this.myPostsPage.set(currentPage);
      this.myPostsPages.set(numberOfPages);
      this.myPostsTotal.set(total ?? this.myPosts().length);
    } else {
      this.savedPostsPage.set(currentPage);
      this.savedPostsPages.set(numberOfPages);
      this.savedPostsTotal.set(total ?? this.savedPosts().length);
    }
  }

  private mergePosts(current: FeedPostData[], incoming: FeedPostData[]): FeedPostData[] {
    const ids = new Set(current.map((post) => post.id));
    return [...current, ...incoming.filter((post) => !ids.has(post.id))];
  }

  private setPostsLoading(append: boolean): void {
    append ? this.isLoadingMore.set(true) : this.isPostsLoading.set(true);
  }

  private finishPostsLoading(): void {
    this.isPostsLoading.set(false);
    this.isLoadingMore.set(false);
  }

  private revokeAvatarObjectUrl(): void {
    if (this.avatarObjectUrl) {
      URL.revokeObjectURL(this.avatarObjectUrl);
      this.avatarObjectUrl = null;
    }
  }

  private revokeCoverObjectUrl(): void {
    if (this.coverObjectUrl) {
      URL.revokeObjectURL(this.coverObjectUrl);
      this.coverObjectUrl = null;
    }
  }

  private syncScrollLock(): void {
    this.setPageScrollLocked(
      !!this.lightboxImage() ||
        !!this.cropImage() ||
        this.isCoverDialogOpen() ||
        this.isRemoveCoverDialogOpen(),
    );
  }

  private setPageScrollLocked(locked: boolean): void {
    document.body.style.overflow = locked ? 'hidden' : '';
  }
}
