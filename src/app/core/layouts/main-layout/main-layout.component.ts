import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgxSpinnerComponent } from 'ngx-spinner';
import { NavbarComponent } from '../components/navbar/navbar.component';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, NgxSpinnerComponent, NavbarComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent {}
