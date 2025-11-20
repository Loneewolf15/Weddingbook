import { ChangeDetectionStrategy, Component, input, output, signal, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { WeddingEvent } from '../../models/event.model';
import { ImageSharpnessService } from '../../services/image-sharpness.service';
import { GeminiService } from '../../services/gemini.service';

type UploadState = 'idle' | 'capturing' | 'preview' | 'checking' | 'captioning' | 'uploading' | 'success';

@Component({
  selector: 'app-guest-view',
  standalone: true,
  imports: [CommonModule, NgOptimizedImage],
  templateUrl: './guest-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuestViewComponent {
  event = input.required<WeddingEvent>();
  reset = output<void>();

  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;
  
  private sharpnessService = inject(ImageSharpnessService);
  private geminiService = inject(GeminiService);

  uploadState = signal<UploadState>('idle');
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  blurWarning = signal(false);
  isUploading = signal(false);
  geminiCaption = signal('');
  isGeneratingCaption = signal(false);
  cameraError = signal<string | null>(null);
  cameraFacingMode = signal<'user' | 'environment'>('environment');

  readonly BLUR_THRESHOLD = 100;

  get isGeminiConfigured(): boolean {
    return this.geminiService.isConfigured();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.handleFile(file);
    }
  }

  async handleFile(file: File): Promise<void> {
    this.selectedFile.set(file);
    this.previewUrl.set(URL.createObjectURL(file));
    this.uploadState.set('checking');
    
    try {
      const sharpness = await this.sharpnessService.checkSharpness(file);
      if (sharpness < this.BLUR_THRESHOLD) {
        this.blurWarning.set(true);
      }
    } catch (error) {
      console.error("Sharpness check failed:", error);
      // Fail open, allow upload anyway
    } finally {
      this.uploadState.set('preview');
    }
  }
  
  async startCamera(): Promise<void> {
    this.uploadState.set('capturing');
    this.cameraError.set(null); // Clear previous errors
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: this.cameraFacingMode() } });
        if (this.videoElement) {
            this.videoElement.nativeElement.srcObject = stream;
        }
    } catch (err: any) {
        console.error("Error accessing camera: ", err);
        if (err.name === 'NotAllowedError') {
          this.cameraError.set('Camera access was denied. Please enable camera permissions in your browser settings and try again.');
        } else if (err.name === 'NotFoundError') {
           this.cameraError.set('No camera was found on your device. You can still upload a photo from your library.');
        } else {
          this.cameraError.set('Could not access the camera. Please check your device settings.');
        }
        this.uploadState.set('idle');
    }
  }

  capturePhoto(): void {
    if (!this.videoElement) return;

    const video = this.videoElement.nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
        this.stopStream();
        this.handleFile(file);
      }
    }, 'image/jpeg');
  }

  private stopStream(): void {
    if (this.videoElement?.nativeElement?.srcObject) {
      const stream = this.videoElement.nativeElement.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      this.videoElement.nativeElement.srcObject = null;
    }
  }
  
  switchCamera(): void {
    this.stopStream();
    this.cameraFacingMode.update(mode => mode === 'environment' ? 'user' : 'environment');
    this.startCamera();
  }

  stopCamera(): void {
    this.stopStream();
    this.uploadState.set('idle');
  }

  uploadPhoto(): void {
    this.uploadState.set('uploading');
    this.isUploading.set(true);
    // Simulate upload process
    setTimeout(() => {
      this.isUploading.set(false);
      this.uploadState.set('success');
      this.resetPreview();
    }, 2000);
  }

  async generateCaption(): Promise<void> {
    const file = this.selectedFile();
    if (!file || !this.isGeminiConfigured) return;

    this.isGeneratingCaption.set(true);
    this.uploadState.set('captioning');
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64String = (reader.result as string).split(',')[1];
      const caption = await this.geminiService.generateCaptionForImage(base64String);
      this.geminiCaption.set(caption);
      this.isGeneratingCaption.set(false);
      this.uploadState.set('preview');
    };
    reader.onerror = (error) => {
        console.error("Error reading file for caption generation:", error);
        this.isGeneratingCaption.set(false);
        this.uploadState.set('preview');
    };
  }

  resetPreview(): void {
    if (this.previewUrl()) {
      URL.revokeObjectURL(this.previewUrl()!);
    }
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    this.blurWarning.set(false);
    this.geminiCaption.set('');
    this.uploadState.set('idle');
  }
  
  resetApp(): void {
    this.reset.emit();
  }
}