import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-single-comment',
  imports: [],
  templateUrl: './single-comment.component.html',
  styleUrl: './single-comment.component.css',
})
export class SingleCommentComponent {
  @Input() comment!: any;
  @Output() viewAllComments = new EventEmitter<void>();
}
