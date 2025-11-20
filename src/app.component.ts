import { ChangeDetectionStrategy, Component, signal, effect, inject, Renderer2, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HostDashboardComponent } from './components/host-dashboard/host-dashboard.component';
import { GuestViewComponent } from './components/guest-view/guest-view.component';
import { EventService } from './services/event.service';
import { WeddingEvent } from './models/event.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  // FIX: Corrected the invalid `Change.OnPush` to `ChangeDetectionStrategy.OnPush`.
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, HostDashboardComponent, GuestViewComponent],
})
export class AppComponent {
  private eventService = inject(EventService);
  private renderer = inject(Renderer2);
  private el = inject(ElementRef);
  private cdr = inject(ChangeDetectorRef);

  // 'host' or 'guest'
  view = signal<'host' | 'guest'>('host');
  event = this.eventService.event;

  constructor() {
    effect(() => {
      const currentEvent = this.event();
      const docElement = this.el.nativeElement.ownerDocument.documentElement;
      if (currentEvent && currentEvent.theme) {
        const colors = currentEvent.theme.colors;
        // Set the primary colors as CSS variables
        this.renderer.setStyle(docElement, '--primary-color-1', colors[0] || '#000000');
        // Fallback to the previous color if not defined
        this.renderer.setStyle(docElement, '--primary-color-2', colors[1] || colors[0] || '#000000');
        this.renderer.setStyle(docElement, '--primary-color-3', colors[2] || colors[1] || colors[0] || '#000000');

        const body = this.el.nativeElement.ownerDocument.body;
        body.classList.remove('theme-modern', 'theme-retro', 'theme-luxury');
        body.classList.add(currentEvent.theme.styleClass);

        // Forcing a re-render in case styles affect child components
        this.cdr.detectChanges();
      }
    });
  }

  onEventCreated(createdEvent: WeddingEvent): void {
    this.eventService.setEvent(createdEvent);
    this.view.set('guest');
  }

  switchToHostView(): void {
    this.eventService.clearEvent();
    const body = this.el.nativeElement.ownerDocument.body;
    body.classList.remove('theme-modern', 'theme-retro', 'theme-luxury');
    
    const docElement = this.el.nativeElement.ownerDocument.documentElement;
    this.renderer.removeStyle(docElement, '--primary-color-1');
    this.renderer.removeStyle(docElement, '--primary-color-2');
    this.renderer.removeStyle(docElement, '--primary-color-3');
    this.view.set('host');
  }
}
