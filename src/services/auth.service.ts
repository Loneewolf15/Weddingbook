import { Injectable, signal } from '@angular/core';

interface User {
  name: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly _currentUser = signal<User | null>(null);
  public readonly currentUser = this._currentUser.asReadonly();

  login(email: string): void {
    // In a real app, this would involve an API call.
    this._currentUser.set({ name: 'Wedding Host', email: email });
  }

  logout(): void {
    this._currentUser.set(null);
  }
}
