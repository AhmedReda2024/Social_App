import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  OnInit,
} from '@angular/core';
import { FeedPostData } from '../../../features/feed/model/feed.interface';
import { PostsService } from '../../../features/feed/services/posts.service';
import { SingleCommentComponent } from '../single-comment/single-comment.component';
import { CommentsService } from '../../../core/services/comments/comments.service';
import { RouterLink } from '@angular/router';
import {
  SharePostModalComponent,
  SharePostPreview,
} from '../share-post-modal/share-post-modal.component';

@Component({
  selector: 'app-single-post',
  imports: [SingleCommentComponent, RouterLink, SharePostModalComponent],
  templateUrl: './single-post.component.html',
  styleUrl: './single-post.component.css',
})
export class SinglePostComponent implements OnInit {
  @Input() post!: FeedPostData;
  @Input() expandComments = false;
  @Input() showDetailsLink = true;
  @Output() readonly postDeleted = new EventEmitter<string>();

  @ViewChild('commentsListScroll') commentsListScroll!: ElementRef<HTMLDivElement>;

  private readonly postsService = inject(PostsService);
  private readonly commentsService = inject(CommentsService);

  ngOnInit(): void {
    if (this.expandComments) {
      this.showComments.set(true);
      this.showAllComments.set(true);
      this.loadComments();
    }
  }

  readonly isMenuOpen = signal<boolean>(false);
  readonly isEditing = signal<boolean>(false);
  readonly isConfirmModalOpen = signal<boolean>(false);
  readonly isShareModalOpen = signal<boolean>(false);
  readonly isDeleting = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);

  // Comments & Replies State
  readonly showComments = signal<boolean>(false);
  readonly showAllComments = signal<boolean>(false);
  readonly comments = signal<any[]>([]);
  readonly isLoadingComments = signal<boolean>(false);
  readonly isSubmittingComment = signal<boolean>(false);
  readonly sortOrder = signal<'relevant' | 'newest'>('relevant');
  readonly deletingCommentIds = signal<Map<string, boolean>>(new Map());
  readonly activeDeletingCommentId = signal<string | null>(null);
  readonly isCommentConfirmModalOpen = signal<boolean>(false);
  readonly isDeletingReply = computed(() => {
    const id = this.activeDeletingCommentId();
    if (!id) return false;
    for (const replies of this.repliesList().values()) {
      if (replies.some((r) => (r._id || r.id) === id)) {
        return true;
      }
    }
    return false;
  });
  readonly activeCommentMenuId = signal<string | null>(null);
  readonly activeEditingCommentId = signal<string | null>(null);
  readonly editingCommentText = signal<string>('');
  readonly isSavingComment = signal<boolean>(false);

  // Comment Form State
  readonly newCommentText = signal<string>('');
  readonly commentImage = signal<File | null>(null);
  readonly commentImagePreview = signal<string | null>(null);
  readonly showEmojiPicker = signal<boolean>(false);

  // Replies State
  readonly activeReplyCommentId = signal<string | null>(null);
  readonly replyTextMap = signal<Map<string, string>>(new Map());
  readonly repliesList = signal<Map<string, any[]>>(new Map());
  readonly loadingReplies = signal<Map<string, boolean>>(new Map());
  readonly submittingReply = signal<Map<string, boolean>>(new Map());

  // Reply Form image/emoji states
  readonly replyImage = signal<File | null>(null);
  readonly replyImagePreview = signal<string | null>(null);
  readonly showReplyEmojiPicker = signal<boolean>(false);

  // Emojis list
  readonly emojis = ['😊', '😂', '😍', '👍', '🔥', '👏', '❤️', '🎉', '😢', '😮', '🙌', '✨'];

  onCommentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submitComment();
    }
  }

  isSafeKey(key: string): boolean {
    if (!key || typeof key !== 'string') {
      return false;
    }
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return false;
    }
    return /^[a-zA-Z0-9\-_]+$/.test(key);
  }

  getCurrentUserId(): string {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        return decoded.user || decoded.id || decoded._id || '';
      }
    } catch {}
    return '';
  }

  authorRoute(userId?: string): string[] {
    if (!userId || userId === this.getCurrentUserId()) {
      return ['/profile'];
    }

    return ['/profile', userId];
  }

  getCurrentUser() {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        return {
          _id: decoded.user || decoded.id || decoded._id || '',
          name: decoded.name || 'Ahmed Reda',
          username: decoded.username || 'ahmedreda',
          photo: decoded.photo || '/assets/images/default-profile.png',
        };
      }
    } catch {}
    return {
      _id: '',
      name: 'Ahmed Reda',
      username: 'ahmedreda',
      photo: '/assets/images/default-profile.png',
    };
  }

  getCommentRelativeTime(createdAt: string): string {
    return this.postsService.getRelativeTime(createdAt);
  }

  generatedPostLabel(): string | null {
    const body = this.post?.body?.trim().toLowerCase();
    if (body === 'updated profile picture.') {
      return 'updated profile picture.';
    }
    if (body === 'updated cover photo.') {
      return 'updated cover photo.';
    }
    return null;
  }

  toggleComments(): void {
    const nextState = !this.showComments();
    this.showComments.set(nextState);
    if (nextState) {
      this.loadComments();
    } else {
      this.showAllComments.set(false);
    }
  }

  loadComments(page: number = 1, scrollTo?: 'top' | 'bottom'): void {
    this.isLoadingComments.set(page === 1);
    this.commentsService.getPostComments(this.post.id, page, 50).subscribe({
      next: (res) => {
        this.isLoadingComments.set(false);
        const fetched = res.data?.comments || res.data || res || [];
        const mapped = fetched.map((c: any) => {
          const commentId = c.id || c._id;
          if (c.replies && commentId) {
            this.repliesList.update((lists) => {
              lists.set(
                commentId,
                c.replies.map((r: any) => ({
                  ...r,
                  relativeTime: this.postsService.getRelativeTime(r.createdAt),
                })),
              );
              return new Map(lists);
            });
          }
          return {
            ...c,
            relativeTime: this.postsService.getRelativeTime(c.createdAt),
            isLiked: c.likes?.includes(this.getCurrentUserId()) || !!c.isLiked,
          };
        });

        if (this.sortOrder() === 'newest') {
          mapped.sort(
            (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
        }

        this.comments.set(mapped);
        this.post.commentsCount = mapped.length;

        if (scrollTo) {
          setTimeout(() => {
            if (this.commentsListScroll) {
              const el = this.commentsListScroll.nativeElement;
              el.scrollTo({
                top: scrollTo === 'top' ? 0 : el.scrollHeight,
                behavior: 'smooth',
              });
            }
          }, 100);
        }
      },
      error: () => {
        this.isLoadingComments.set(false);
      },
    });
  }

  changeSortOrder(order: 'relevant' | 'newest'): void {
    this.sortOrder.set(order);
    this.loadComments();
  }

  onCommentImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files[0]) {
      const file = input.files[0];
      this.commentImage.set(file);
      const reader = new FileReader();
      reader.onload = () => {
        this.commentImagePreview.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  removeCommentImage(): void {
    this.commentImage.set(null);
    this.commentImagePreview.set(null);
  }

  toggleEmojiPicker(): void {
    this.showEmojiPicker.update((val) => !val);
  }

  addEmoji(emoji: string): void {
    this.newCommentText.update((text) => text + emoji);
    this.showEmojiPicker.set(false);
  }

  submitComment(): void {
    const text = this.newCommentText().trim();
    const file = this.commentImage();

    if (!text && !file) {
      return;
    }

    this.isSubmittingComment.set(true);

    const formData = new FormData();
    if (text) {
      formData.append('content', text);
    }
    if (file) {
      formData.append('image', file);
    }

    this.commentsService.addComment(this.post.id, formData).subscribe({
      next: () => {
        this.isSubmittingComment.set(false);
        this.newCommentText.set('');
        this.removeCommentImage();
        this.showAllComments.set(true);
        this.loadComments(1, this.sortOrder() === 'newest' ? 'top' : 'bottom');
      },
      error: () => {
        this.isSubmittingComment.set(false);
      },
    });
  }

  onLikeComment(comment: any): void {
    const commentId = comment.id || comment._id;
    if (!this.isSafeKey(commentId)) {
      return;
    }
    const wasLiked = comment.isLiked;

    // Toggle state optimistically
    comment.isLiked = !comment.isLiked;
    if (!comment.likes) {
      comment.likes = [];
    }

    if (wasLiked) {
      comment.likes = comment.likes.filter((id: string) => id !== this.getCurrentUserId());
      comment.likesCount = Math.max(0, (comment.likesCount || 1) - 1);
    } else {
      comment.likes.push(this.getCurrentUserId());
      comment.likesCount = (comment.likesCount || 0) + 1;
    }

    this.commentsService.toggleLikeComment(this.post.id, commentId).subscribe({
      next: (res) => {
        if (res.data) {
          comment.likes = res.data.likes || comment.likes;
          comment.likesCount =
            res.data.likesCount !== undefined
              ? res.data.likesCount
              : res.data.likes?.length || comment.likesCount;
        }
      },
      error: () => {
        // Rollback
        comment.isLiked = wasLiked;
        if (wasLiked) {
          comment.likes.push(this.getCurrentUserId());
          comment.likesCount++;
        } else {
          comment.likes = comment.likes.filter((id: string) => id !== this.getCurrentUserId());
          comment.likesCount = Math.max(0, comment.likesCount - 1);
        }
      },
    });
  }

  onDeleteComment(commentId: string): void {
    if (!this.isSafeKey(commentId)) {
      return;
    }
    this.activeDeletingCommentId.set(commentId);
    this.isCommentConfirmModalOpen.set(true);
    this.activeCommentMenuId.set(null); // Close menu
  }

  confirmDeleteComment(): void {
    const commentId = this.activeDeletingCommentId();
    if (!commentId || !this.isSafeKey(commentId)) {
      return;
    }

    this.deletingCommentIds.update((map) => {
      map.set(commentId, true);
      return new Map(map);
    });

    this.commentsService.deleteComment(this.post.id, commentId).subscribe({
      next: () => {
        this.deletingCommentIds.update((map) => {
          map.delete(commentId);
          return new Map(map);
        });

        // Find if the deleted item is a reply under a parent comment
        let parentCommentId: string | null = null;
        for (const [pId, replies] of this.repliesList().entries()) {
          if (replies.some((r) => (r._id || r.id) === commentId)) {
            parentCommentId = pId;
            break;
          }
        }

        if (parentCommentId) {
          // Remove from repliesList
          this.repliesList.update((lists) => {
            const replies = lists.get(parentCommentId!) || [];
            lists.set(
              parentCommentId!,
              replies.filter((r) => (r._id || r.id) !== commentId),
            );
            return new Map(lists);
          });
        } else {
          // Remove from comments list and update commentsCount
          this.comments.update((list) => list.filter((c) => (c.id || c._id) !== commentId));
          this.post.commentsCount = Math.max(0, this.post.commentsCount - 1);
        }

        this.isCommentConfirmModalOpen.set(false);
        this.activeDeletingCommentId.set(null);
      },
      error: () => {
        this.deletingCommentIds.update((map) => {
          map.delete(commentId);
          return new Map(map);
        });
        this.isCommentConfirmModalOpen.set(false);
        this.activeDeletingCommentId.set(null);
      },
    });
  }

  toggleCommentMenu(commentId: string): void {
    if (!this.isSafeKey(commentId)) {
      return;
    }
    if (this.activeCommentMenuId() === commentId) {
      this.activeCommentMenuId.set(null);
    } else {
      this.activeCommentMenuId.set(commentId);
    }
  }

  startEditComment(comment: any): void {
    const commentId = comment.id || comment._id;
    if (!this.isSafeKey(commentId)) {
      return;
    }
    this.activeEditingCommentId.set(commentId);
    this.editingCommentText.set(comment.content);
    this.activeCommentMenuId.set(null); // Close menu
  }

  saveEditedComment(comment: any): void {
    const commentId = comment.id || comment._id;
    if (!this.isSafeKey(commentId)) {
      return;
    }
    const newContent = this.editingCommentText().trim();
    if (!newContent) {
      return;
    }

    this.isSavingComment.set(true);

    const formData = new FormData();
    formData.append('content', newContent);

    this.commentsService.updateComment(this.post.id, commentId, formData).subscribe({
      next: () => {
        comment.content = newContent;
        this.isSavingComment.set(false);
        this.activeEditingCommentId.set(null);
      },
      error: () => {
        this.isSavingComment.set(false);
      },
    });
  }

  isCommentOwner(comment: any): boolean {
    const creatorId =
      comment.commentCreator?._id ||
      comment.commentCreator?.id ||
      comment.user?._id ||
      comment.user?.id ||
      '';
    return creatorId === this.getCurrentUserId();
  }

  toggleReplies(comment: any): void {
    const commentId = comment.id || comment._id;
    if (!this.isSafeKey(commentId)) {
      return;
    }
    const isCurrentlyOpen = this.activeReplyCommentId() === commentId;

    if (isCurrentlyOpen) {
      this.activeReplyCommentId.set(null);
    } else {
      this.activeReplyCommentId.set(commentId);
      this.loadReplies(commentId);
    }
  }

  loadReplies(commentId: string): void {
    if (!this.isSafeKey(commentId)) {
      return;
    }
    this.loadingReplies.update((map) => {
      map.set(commentId, true);
      return new Map(map);
    });

    this.commentsService.getCommentsReplies(this.post.id, commentId, 1, 50).subscribe({
      next: (res) => {
        this.loadingReplies.update((map) => {
          map.delete(commentId);
          return new Map(map);
        });
        const fetched = res.data?.replies || res.data || res || [];
        const mapped = fetched.map((r: any) => ({
          ...r,
          relativeTime: this.postsService.getRelativeTime(r.createdAt),
        }));
        this.repliesList.update((lists) => {
          lists.set(commentId, mapped);
          return new Map(lists);
        });
      },
      error: () => {
        this.loadingReplies.update((map) => {
          map.delete(commentId);
          return new Map(map);
        });
      },
    });
  }

  updateReplyText(commentId: string, val: string): void {
    if (!this.isSafeKey(commentId)) {
      return;
    }
    this.replyTextMap.update((map) => {
      map.set(commentId, val);
      return new Map(map);
    });
  }

  onReplyImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files[0]) {
      const file = input.files[0];
      this.replyImage.set(file);
      const reader = new FileReader();
      reader.onload = () => {
        this.replyImagePreview.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  removeReplyImage(): void {
    this.replyImage.set(null);
    this.replyImagePreview.set(null);
  }

  toggleReplyEmojiPicker(): void {
    this.showReplyEmojiPicker.update((val) => !val);
  }

  addReplyEmoji(emoji: string, commentId: string): void {
    const currentText = this.replyTextMap().get(commentId) || '';
    this.updateReplyText(commentId, currentText + emoji);
    this.showReplyEmojiPicker.set(false);
  }

  submitReply(commentId: string): void {
    if (!this.isSafeKey(commentId)) {
      return;
    }
    const text = (this.replyTextMap().get(commentId) || '').trim();
    const file = this.replyImage();
    if (!text && !file) {
      return;
    }

    this.submittingReply.update((map) => {
      map.set(commentId, true);
      return new Map(map);
    });

    const formData = new FormData();
    if (text) {
      formData.append('content', text);
    }
    if (file) {
      formData.append('image', file);
    }

    this.commentsService.addReply(this.post.id, commentId, formData).subscribe({
      next: () => {
        this.submittingReply.update((map) => {
          map.delete(commentId);
          return new Map(map);
        });
        this.updateReplyText(commentId, '');
        this.replyImage.set(null);
        this.replyImagePreview.set(null);
        this.loadReplies(commentId);
      },
      error: () => {
        this.submittingReply.update((map) => {
          map.delete(commentId);
          return new Map(map);
        });
      },
    });
  }

  isPostOwner(): boolean {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return false;
      } else {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        return (decoded.user || decoded.id || decoded._id) === this.post?.user?._id;
      }
    } catch {
      return false;
    }
  }

  toggleMenu(): void {
    this.isMenuOpen.update((val) => !val);
  }

  openShareModal(): void {
    this.isShareModalOpen.set(true);
  }

  closeShareModal(): void {
    this.isShareModalOpen.set(false);
  }

  shareTarget(): SharePostPreview {
    const originalPost = this.post.isShare ? this.post.sharedPost : null;

    if (originalPost && (originalPost.id || originalPost._id)) {
      return {
        id: originalPost.id || originalPost._id,
        body: originalPost.body,
        image: originalPost.image,
        user: originalPost.user || this.post.user,
      };
    }

    return {
      id: this.post.id || this.post._id,
      body: this.post.body,
      image: this.post.image,
      user: this.post.user,
    };
  }

  onPostShared(): void {
    this.post.sharesCount = (this.post.sharesCount || 0) + 1;
    this.closeShareModal();
    this.postsService.changeFilter(this.postsService.currentFilter());
  }

  toggleLike(post: FeedPostData) {
    const originalIsLiked = post.isLiked;
    const originalLikesCount = post.likesCount;

    // Optimistic toggle
    post.isLiked = !post.isLiked;
    post.likesCount += post.isLiked ? 1 : -1;

    this.postsService.toggleLikePost(post.id).subscribe({
      next: () => {
        // Keeps UI in sync
      },
      error: () => {
        // Rollback on error
        post.isLiked = originalIsLiked;
        post.likesCount = originalLikesCount;
      },
    });
  }

  onSavePost(): void {
    // Optimistically toggle bookmark
    const originalState = this.post.bookmarked;
    this.post.bookmarked = !this.post.bookmarked;
    this.isMenuOpen.set(false);

    this.postsService.toggleBookmark(this.post.id).subscribe({
      next: (res) => {
        // If we are currently on the 'saved' filter and unsaved the post, reload the current filter feed
        if (this.postsService.currentFilter() === 'saved' && !this.post.bookmarked) {
          this.postsService.changeFilter('saved');
        }
      },
      error: () => {
        // Rollback on error
        this.post.bookmarked = originalState;
      },
    });
  }

  onEditPost(): void {
    this.isEditing.set(true);
    this.isMenuOpen.set(false);
  }

  saveEditedPost(newBody: string): void {
    if (!newBody || !newBody.trim()) {
      return;
    }

    this.isSaving.set(true);

    this.postsService.updatePost(this.post.id, newBody).subscribe({
      next: () => {
        this.post.body = newBody;
        this.isSaving.set(false);
        this.isEditing.set(false);
      },
      error: () => {
        this.isSaving.set(false);
      },
    });
  }

  onDeletePost(): void {
    this.isMenuOpen.set(false);
    this.isConfirmModalOpen.set(true);
  }

  confirmDelete(): void {
    this.isDeleting.set(true);
    this.postsService.deletePost(this.post.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.isConfirmModalOpen.set(false);
        this.postDeleted.emit(this.post.id);
        // Refresh the feed
        this.postsService.changeFilter(this.postsService.currentFilter());
      },
      error: () => {
        this.isDeleting.set(false);
        this.isConfirmModalOpen.set(false);
      },
    });
  }
}
