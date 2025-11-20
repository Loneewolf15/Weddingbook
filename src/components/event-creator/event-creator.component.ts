import { ChangeDetectionStrategy, Component, output, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WeddingEvent, Theme } from '../../models/event.model';
import { EventService } from '../../services/event.service';
import QRCode from 'qrcode';

@Component({
  selector: 'app-event-creator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './event-creator.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventCreatorComponent {
  eventCreated = output<WeddingEvent>();
  backToDashboard = output<void>();

  private eventService = inject(EventService);

  coupleNames = signal('');
  eventDate = signal('');
  selectedTheme = signal<'Modern' | 'Retro' | 'Luxury'>('Modern');
  
  // State for raw user input
  themeColorInputs = signal<string[]>(['#4169E1', '#708090']);
  // State for validated, canonical hex color codes
  themeColors = signal<string[]>(['#4169E1', '#708090']);
  // State for validation errors
  colorErrors = signal<(string | null)[]>(['', '']);

  qrCodeUrl = signal('');
  showQrCode = signal(false);
  createdEventData = signal<WeddingEvent | null>(null);
  qrNote = signal('Scan this code to upload your photos to our wedding album!');
  coverPhotoUrl = this.eventService.event()?.coverPhotoUrl;
  
  hasErrors = computed(() => this.colorErrors().some(e => e !== null && e !== ''));

  themes = [
    { name: 'Modern', class: 'theme-modern', defaultColors: ['#4169E1', '#708090'] },
    { name: 'Retro', class: 'theme-retro', defaultColors: ['#F4A460', '#FFDAB9'] },
    { name: 'Luxury', class: 'theme-luxury', defaultColors: ['#FFD700', '#2F4F4F'] }
  ] as const;

  onThemeChange(selectedValue: 'Modern' | 'Retro' | 'Luxury'): void {
    this.selectedTheme.set(selectedValue);
    const themeConfig = this.themes.find(t => t.name === selectedValue);
    if (themeConfig) {
      const defaultColors = [...themeConfig.defaultColors];
      this.themeColors.set(defaultColors);
      this.themeColorInputs.set(defaultColors);
      this.colorErrors.set(defaultColors.map(() => null));
    }
  }

  updateColorInput(index: number, value: string): void {
      this.themeColorInputs.update(current => {
          const newInputs = [...current];
          newInputs[index] = value;
          return newInputs;
      });
  }

  validateAndCommitColor(index: number): void {
    const rawColor = this.themeColorInputs()[index]?.trim();

    if (!rawColor) {
        this.colorErrors.update(errors => {
            const newErrors = [...errors];
            newErrors[index] = 'Color cannot be empty.';
            return newErrors;
        });
        return;
    }

    if (CSS.supports('color', rawColor)) {
      const hexColor = this.colorToHex(rawColor);
      this.themeColors.update(current => {
        const newColors = [...current];
        newColors[index] = hexColor;
        return newColors;
      });
      this.themeColorInputs.update(current => {
          const newInputs = [...current];
          newInputs[index] = hexColor;
          return newInputs;
      });
      this.colorErrors.update(errors => {
        const newErrors = [...errors];
        newErrors[index] = null;
        return newErrors;
      });
    } else {
      this.colorErrors.update(errors => {
        const newErrors = [...errors];
        newErrors[index] = `'${rawColor}' is not a valid color.`;
        return newErrors;
      });
    }
  }

  private colorToHex(color: string): string {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return '#000000';
    ctx.fillStyle = color;
    return ctx.fillStyle;
  }

  addColor(): void {
    if (this.themeColorInputs().length >= 3) return;
    const newColor = '#CCCCCC';
    this.themeColorInputs.update(current => [...current, newColor]);
    this.themeColors.update(current => [...current, newColor]);
    this.colorErrors.update(current => [...current, null]);
  }

  removeColor(index: number): void {
    if (this.themeColorInputs().length <= 1) return;
    this.themeColorInputs.update(current => current.filter((_, i) => i !== index));
    this.themeColors.update(current => current.filter((_, i) => i !== index));
    this.colorErrors.update(current => current.filter((_, i) => i !== index));
  }
  
  async createEvent(): Promise<void> {
    this.themeColorInputs().forEach((_, index) => this.validateAndCommitColor(index));
    
    if (this.hasErrors()) {
      alert('Please fix invalid colors before creating the event.');
      return;
    }
    
    if (!this.coupleNames() || !this.eventDate()) {
      alert('Please fill in all fields.');
      return;
    }
    
    const themeClass = this.themes.find(t => t.name === this.selectedTheme())?.class || 'theme-modern';
    const theme: Theme = {
      style: this.selectedTheme(),
      colors: this.themeColors(),
      styleClass: themeClass,
    };

    const eventData: WeddingEvent = {
      coupleNames: this.coupleNames(),
      eventDate: this.eventDate(),
      theme: theme,
      coverPhotoUrl: this.coverPhotoUrl
    };
    
    try {
      const finalQrCodeUrl = await this.generatePersonalizedQrCode();
      this.qrCodeUrl.set(finalQrCodeUrl);
      eventData.qrCodeUrl = finalQrCodeUrl;
      this.createdEventData.set(eventData);
      this.showQrCode.set(true);
    } catch (err) {
      console.error(err);
      alert('Failed to generate QR code.');
    }
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
  }

  private getLuminance(r: number, g: number, b: number): number {
      const a = [r, g, b].map(v => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  private getContrastRatio(hex1: string, hex2: string): number {
      const rgb1 = this.hexToRgb(hex1);
      const rgb2 = this.hexToRgb(hex2);
      if (!rgb1 || !rgb2) return 1;
      const lum1 = this.getLuminance(rgb1.r, rgb1.g, rgb1.b);
      const lum2 = this.getLuminance(rgb2.r, rgb2.g, rgb2.b);
      const lighter = Math.max(lum1, lum2);
      const darker = Math.min(lum1, lum2);
      return (lighter + 0.05) / (darker + 0.05);
  }

  private generatePersonalizedQrCode(): Promise<string> {
    const guestViewUrl = `${window.location.origin}?event=12345`;
    let primaryColor = this.themeColors()[0] || '#000000';
    let secondaryColor = this.themeColors()[1] || '#FFFFFF';

    const contrastRatio = this.getContrastRatio(primaryColor, secondaryColor);
    const MIN_CONTRAST_RATIO = 4.5;

    if (contrastRatio < MIN_CONTRAST_RATIO) {
        console.warn(
            `Chosen theme colors have a low contrast ratio of ${contrastRatio.toFixed(2)}:1. ` +
            `Falling back to black and white for the QR code to ensure scannability.`
        );
        primaryColor = '#000000';
        secondaryColor = '#FFFFFF';
    }

    return new Promise(async (resolve, reject) => {
        try {
            const baseQrCodeUrl = await QRCode.toDataURL(guestViewUrl, {
                errorCorrectionLevel: 'H', type: 'image/png', width: 256, margin: 1,
                color: { dark: primaryColor, light: '#00000000' }
            });

            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Could not get canvas context'));

            ctx.fillStyle = secondaryColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            const image = new Image();
            image.src = baseQrCodeUrl;
            image.onload = () => {
                ctx.drawImage(image, 0, 0);

                const getInitials = (names: string): string => {
                    if (!names) return '';
                    return names.split(/and|&/i)
                        .map(name => name.trim().charAt(0).toUpperCase())
                        .join(' & ');
                };
                const initials = getInitials(this.coupleNames());
                
                const centerRectSize = canvas.width * 0.4;
                const centerPos = (canvas.width - centerRectSize) / 2;
                ctx.fillStyle = secondaryColor;
                ctx.fillRect(centerPos, centerPos, centerRectSize, centerRectSize);

                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = primaryColor;
                
                let fontSize = 48;
                ctx.font = `bold ${fontSize}px 'Playfair Display', serif`;

                while (ctx.measureText(initials).width > centerRectSize * 0.9 && fontSize > 10) {
                    fontSize--;
                    ctx.font = `bold ${fontSize}px 'Playfair Display', serif`;
                }

                ctx.fillText(initials, canvas.width / 2, canvas.height / 2);
                
                resolve(canvas.toDataURL('image/png'));
            };
            image.onerror = (err) => reject(err);
        } catch(err) {
            reject(err);
        }
    });
  }

  printQrCode(): void {
    window.print();
  }

  proceedToGuestView(): void {
    const event = this.createdEventData();
    if (event) {
      this.eventCreated.emit(event);
    }
  }
}