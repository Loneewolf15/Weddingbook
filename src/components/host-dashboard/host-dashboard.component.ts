import { ChangeDetectionStrategy, Component, output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { PhotoService } from '../../services/photo.service';
import { EventService } from '../../services/event.service';

@Component({
  selector: 'app-host-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './host-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HostDashboardComponent {
  createEvent = output<void>();

  authService = inject(AuthService);
  photoService = inject(PhotoService);
  eventService = inject(EventService);

  photos = this.photoService.photos;
  
  coverPhotoUrl = signal<string | null>(null);

  onCoverPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const url = URL.createObjectURL(file);
      this.coverPhotoUrl.set(url);
      // In a real app, you'd upload this file and get a persistent URL
      this.eventService.updateCoverPhoto(url);
    }
  }

  generatePdf(): void {
    // Placeholder for premium PDF generation feature
    alert('PDF Album Generation is a premium feature coming soon!');
  }

  logout(): void {
    this.authService.logout();
  }
}