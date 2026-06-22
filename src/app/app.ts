import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { applyBrand } from './core/apply-brand';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
})
export class App {
  constructor() {
    applyBrand();
  }
}
