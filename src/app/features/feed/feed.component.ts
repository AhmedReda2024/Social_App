import { Component } from '@angular/core';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { CreatePostComponent } from './components/create-post/create-post.component';
import { SuggestedFriendsComponent } from './components/suggested-friends/suggested-friends.component';

@Component({
  selector: 'app-feed',
  imports: [SidebarComponent, CreatePostComponent, SuggestedFriendsComponent],
  templateUrl: './feed.component.html',
  styleUrl: './feed.component.css',
})
export class FeedComponent {}
