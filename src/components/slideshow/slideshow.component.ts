import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhotoService } from '../../services/photo.service';
import { EventService } from '../../services/event.service';
import { Photo } from '../../models/photo.model';
import { effect } from '@angular/core';

@Component({
  selector: 'app-slideshow',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './slideshow.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SlideshowComponent implements OnInit, OnDestroy {
  close = output<void>();

  private photoService = inject(PhotoService);
  private eventService = inject(EventService);

  photos = this.photoService.photos;
  event = this.eventService.event;
  
  currentIndex = signal(0);
  currentPhoto = signal<Photo | null>(null);
  
  private intervalId: any;

  constructor() {
    effect(() => {
        // If photos are added or removed, restart the slideshow to reflect changes
        this.stopSlideshow();
        if(this.photos().length > 0) {
            if(this.currentIndex() >= this.photos().length) {
                this.currentIndex.set(0);
            }
            this.startSlideshow();
        } else {
            this.currentPhoto.set(null);
        }
    });
  }

  ngOnInit() {
    this.startSlideshow();
  }

  ngOnDestroy() {
    this.stopSlideshow();
  }

  startSlideshow(): void {
    this.updateCurrentPhoto();
    this.intervalId = setInterval(() => {
      this.currentIndex.update(i => (i + 1) % (this.photos().length || 1));
      this.updateCurrentPhoto();
    }, 5000); // Change photo every 5 seconds
  }
  
  stopSlideshow(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private updateCurrentPhoto(): void {
      if(this.photos().length > 0) {
        this.currentPhoto.set(this.photos()[this.currentIndex()]);
      } else {
        this.currentPhoto.set(null);
      }
  }
}