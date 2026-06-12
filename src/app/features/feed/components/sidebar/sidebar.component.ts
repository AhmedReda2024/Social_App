import { Component, inject } from '@angular/core';
import { PostsService } from '../../services/posts.service';

@Component({
  selector: 'app-sidebar',
  imports: [],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  private readonly postsService = inject(PostsService);

  readonly currentFilter = this.postsService.currentFilter;

  changeFilter(filter: string): void {
    this.postsService.changeFilter(filter);
  }
}
