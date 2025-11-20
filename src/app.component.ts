import { ChangeDetectionStrategy, Component, signal, effect, inject, Renderer2, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HostDashboardComponent } from './components/host-dashboard/host-dashboard.component';
import { GuestViewComponent } from './components/guest-view/guest-view.component';
import { LoginComponent } from './components/login/login.component';
import { EventCreatorComponent } from './components/event-creator/event-creator.component';
import { EventService } from './services/event.service';
import { AuthService } from './services/auth.service';
import { WeddingEvent } from './models/event.model';

type AppView = 'login' | 'dashboard' | 'createEvent' | 'guest';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, HostDashboardComponent, GuestViewComponent, LoginComponent, EventCreatorComponent],
})
export class AppComponent {
  private eventService = inject(EventService);
  private authService = inject(AuthService);
  private renderer = inject(Renderer2);
  private el = inject(ElementRef);
  private cdr = inject(ChangeDetectorRef);

  currentView = signal<AppView>('login');
  event = this.eventService.event;

  constructor() {
    // Effect to handle view changes based on authentication
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        // If user is logged in and there's no active event view, show dashboard
        if (this.currentView() === 'login') {
            this.currentView.set('dashboard');
        }
      } else {
        // If user logs out, go back to login
        this.currentView.set('login');
        this.eventService.clearEvent();
      }
    });

    // Effect to handle dynamic theme and cover photo changes
    effect(() => {
      const currentEvent = this.event();
      const docElement = this.el.nativeElement.ownerDocument.documentElement;
      if (currentEvent && currentEvent.theme) {
        const colors = currentEvent.theme.colors;
        this.renderer.setStyle(docElement, '--primary-color-1', colors[0] || '#000000');
        this.renderer.setStyle(docElement, '--primary-color-2', colors[1] || colors[0] || '#000000');
        this.renderer.setStyle(docElement, '--primary-color-3', colors[2] || colors[1] || colors[0] || '#000000');
        
        if (currentEvent.coverPhotoUrl) {
            this.renderer.setStyle(docElement, '--cover-photo-url', `url(${currentEvent.coverPhotoUrl})`);
        }

        const body = this.el.nativeElement.ownerDocument.body;
        body.classList.remove('theme-modern', 'theme-retro', 'theme-luxury');
        body.classList.add(currentEvent.theme.styleClass);
        this.cdr.detectChanges();
      } else {
        // Reset styles when no event is active
        this.resetStyles();
      }
    });
  }
  
  onLoginSuccess(): void {
    this.currentView.set('dashboard');
  }

  onNavigateToCreateEvent(): void {
    this.currentView.set('createEvent');
  }

  onEventCreated(createdEvent: WeddingEvent): void {
    this.eventService.setEvent(createdEvent);
    this.currentView.set('guest');
  }

  onBackToDashboard(): void {
    this.currentView.set('dashboard');
  }

  switchToHostView(): void {
    this.currentView.set('dashboard');
  }

  private resetStyles(): void {
    const body = this.el.nativeElement.ownerDocument.body;
    body.classList.remove('theme-modern', 'theme-retro', 'theme-luxury');
    const docElement = this.el.nativeElement.ownerDocument.documentElement;
    this.renderer.removeStyle(docElement, '--primary-color-1');
    this.renderer.removeStyle(docElement, '--primary-color-2');
    this.renderer.removeStyle(docElement, '--primary-color-3');
    this.renderer.removeStyle(docElement, '--cover-photo-url');
  }
}