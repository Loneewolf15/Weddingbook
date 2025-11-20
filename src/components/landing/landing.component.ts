import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing.component.html',
  // FIX: Corrected typo from 'Change' to 'ChangeDetectionStrategy'.
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent {
  navigateToLogin = output<void>();
  selectedDemoTheme = signal<'modern' | 'retro'>('modern');
}
