import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WeddingEvent, Theme } from '../../models/event.model';
import QRCode from 'qrcode';

@Component({
  selector: 'app-host-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './host-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HostDashboardComponent {
  eventCreated = output<WeddingEvent>();

  coupleNames = signal('');
  eventDate = signal('');
  selectedTheme = signal<'Modern' | 'Retro' | 'Luxury'>('Modern');
  themeColors = signal<string[]>(['#4169E1', '#708090']);
  qrCodeUrl = signal('');
  showQrCode = signal(false);
  createdEventData = signal<WeddingEvent | null>(null);
  qrNote = signal('Scan this code to upload your photos to our wedding album!');

  themes = [
    { name: 'Modern', class: 'theme-modern', defaultColors: ['#4169E1', '#708090'] }, // royalblue, slategray
    { name: 'Retro', class: 'theme-retro', defaultColors: ['#F4A460', '#FFDAB9'] }, // sandybrown, peachpuff
    { name: 'Luxury', class: 'theme-luxury', defaultColors: ['#FFD700', '#2F4F4F'] } // gold, darkslategray
  ] as const;

  onThemeChange(selectedValue: 'Modern' | 'Retro' | 'Luxury'): void {
    this.selectedTheme.set(selectedValue);
    const themeConfig = this.themes.find(t => t.name === selectedValue);
    if (themeConfig) {
      this.themeColors.set([...themeConfig.defaultColors]);
    }
  }

  updateColor(index: number, newColor: string): void {
    this.themeColors.update(currentColors => {
        const updatedColors = [...currentColors];
        updatedColors[index] = newColor;
        return updatedColors;
    });
  }

  addColor(): void {
    this.themeColors.update(currentColors => {
      if (currentColors.length < 3) {
        return [...currentColors, '#CCCCCC']; // Use a hex for lightgray
      }
      return currentColors;
    });
  }

  removeColor(index: number): void {
    this.themeColors.update(currentColors => {
      if (currentColors.length > 1) {
        const updatedColors = [...currentColors];
        updatedColors.splice(index, 1);
        return updatedColors;
      }
      return currentColors;
    });
  }
  
  async createEvent(): Promise<void> {
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

  private generatePersonalizedQrCode(): Promise<string> {
    const guestViewUrl = `${window.location.href}?event=12345`;
    
    // Helper to convert any CSS color string to its hex equivalent.
    const colorToHex = (color: string): string => {
        const ctx = document.createElement('canvas').getContext('2d');
        if (!ctx) return '#000000'; // Fallback
        ctx.fillStyle = color;
        return ctx.fillStyle;
    };
    
    const primaryColor = colorToHex(this.themeColors()[0] || '#000000');
    const secondaryColor = this.themeColors()[1] ? colorToHex(this.themeColors()[1]) : '#FFFFFF';

    return new Promise(async (resolve, reject) => {
        try {
            // Generate QR code with a transparent background to draw on top of our colored canvas
            const baseQrCodeUrl = await QRCode.toDataURL(guestViewUrl, {
                errorCorrectionLevel: 'H', // High correction level is crucial for embedding content
                type: 'image/png',
                width: 256,
                margin: 1,
                color: {
                    dark: primaryColor,
                    light: '#00000000', // Fully transparent background
                }
            });

            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }

            // 1. Draw the background color
            ctx.fillStyle = secondaryColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 2. Draw the QR code image on top
            const image = new Image();
            image.src = baseQrCodeUrl;
            image.onload = () => {
                ctx.drawImage(image, 0, 0);

                // 3. Prepare and draw the couple's names in the center
                const getFirstNames = (names: string): string => {
                    if (!names) return '';
                    return names.split('&')
                        .map(name => name.trim().split(' ')[0])
                        .join(' & ');
                };
                const namesToDisplay = getFirstNames(this.coupleNames());
                
                // Clear a rectangle in the middle for better text readability
                const centerRectSize = canvas.width * 0.4;
                const centerPos = (canvas.width - centerRectSize) / 2;
                ctx.fillStyle = secondaryColor; // Use background color to clear the area
                ctx.fillRect(centerPos, centerPos, centerRectSize, centerRectSize);

                // Configure and draw text
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = primaryColor; // Use primary color for the text

                // Dynamically adjust font size to fit within the cleared area
                const maxTextWidth = centerRectSize * 0.9;
                let fontSize = 28;
                ctx.font = `bold ${fontSize}px sans-serif`;

                while (ctx.measureText(namesToDisplay).width > maxTextWidth && fontSize > 10) {
                    fontSize--;
                    ctx.font = `bold ${fontSize}px sans-serif`;
                }

                ctx.fillText(namesToDisplay, canvas.width / 2, canvas.height / 2);
                
                // 4. Resolve the promise with the final data URL
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