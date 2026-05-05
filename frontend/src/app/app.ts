import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonDelayService } from './core/services/button-delay.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  styles: [`:host { display: block; min-height: 100vh; }`]
})
export class App {
  constructor(private buttonDelay: ButtonDelayService) {
    void this.buttonDelay;
  }
}
