import { Injectable, signal } from '@angular/core';
import { WeddingEvent } from '../models/event.model';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private readonly _event = signal<WeddingEvent | null>(null);
  public readonly event = this._event.asReadonly();

  setEvent(event: WeddingEvent): void {
    this._event.set(event);
  }
  
  updateCoverPhoto(url: string): void {
    this._event.update(currentEvent => {
      if (currentEvent) {
        return { ...currentEvent, coverPhotoUrl: url };
      }
      // Create a temporary event if none exists, just to hold the photo
      return {
          coupleNames: '', eventDate: '',
          theme: { style: 'Modern', styleClass: 'theme-modern', colors: ['#4169E1']},
          coverPhotoUrl: url 
      };
    });
  }

  clearEvent(): void {
    this._event.set(null);
  }
}
