import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AnalyticsService } from './core/services/analytics.service';
import { AuthService } from './core/services/auth.service';
import { LanguageService } from './core/services/language.service';
import { PushNotificationService } from './core/services/push-notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />'
})
export class AppComponent {
  constructor() {
    inject(AnalyticsService).init();
    inject(AuthService).tryAutoRefresh();
    inject(PushNotificationService);
    const lang = inject(LanguageService);
    lang.use(lang.current());
  }
}
