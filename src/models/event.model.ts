export interface Theme {
  style: 'Modern' | 'Retro' | 'Luxury';
  styleClass: string;
  colors: string[];
}

export interface WeddingEvent {
  coupleNames: string;
  eventDate: string;
  theme: Theme;
  qrCodeUrl?: string;
}