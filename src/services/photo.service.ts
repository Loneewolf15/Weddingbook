import { Injectable, signal } from '@angular/core';
import { Photo } from '../models/photo.model';

@Injectable({
  providedIn: 'root'
})
export class PhotoService {
  // Initialize with some mock data for demonstration
  private readonly _photos = signal<Photo[]>([
    {
      imageUrl: 'https://picsum.photos/seed/guest1/400/300',
      note: 'Congratulations! Such a beautiful ceremony.'
    },
    {
      imageUrl: 'https://picsum.photos/seed/guest2/400/300',
      note: 'So much fun on the dance floor! Best wishes to you both.'
    }
  ]);
  public readonly photos = this._photos.asReadonly();

  addPhoto(photo: Photo): void {
    // In a real app, we would handle file uploads here
    this._photos.update(currentPhotos => [photo, ...currentPhotos]);
  }
}
