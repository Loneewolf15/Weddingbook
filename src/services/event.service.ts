
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
  
  clearEvent(): void {
    this._event.set(null);
  }
}
