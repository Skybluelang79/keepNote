import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SyncService } from '../../services/sync.service';
import { AppIcon } from '../app-icon/app-icon.component';

@Component({
  selector: 'app-auth-dialog',
  standalone: true,
  imports: [FormsModule, AppIcon],
  styleUrls: ['./auth-dialog.component.css'],
  template: `
    @if (sync.authDialogOpen()) {
      <div class="modal-scrim" (click)="close()">
        <div class="modal" role="dialog" aria-modal="true" aria-label="Account and sync" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h2>KeepNote Sync</h2>
            <button type="button" class="icon-btn" aria-label="Close" (click)="close()">
              <app-icon name="close" />
            </button>
          </div>

          @if (sync.user(); as user) {
            <div class="signed-in">
              <div class="who">
                <div class="avatar">{{ initials(user.email ?? 'K') }}</div>
                <div>
                  <strong>{{ user.email }}</strong>
                  <span class="st" [attr.data-status]="sync.status()">{{ statusLabel() }}</span>
                </div>
              </div>
              <button type="button" class="btn danger-ghost" (click)="sync.signOutUser()">Sign out</button>
            </div>
          } @else if (sync.disabled()) {
            <div class="note">
              <strong>Sync isn’t configured yet.</strong>
              <p>
                To enable cloud sync and accounts, add your Firebase project config in
                <code>src/environments/environment.ts</code>, then run <code>npm run build</code>.
              </p>
            </div>
          } @else {
            <div class="tabs" role="tablist">
              <button
                type="button"
                role="tab"
                [class.active]="mode() === 'signin'"
                (click)="mode.set('signin'); sync.error.set('')"
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                [class.active]="mode() === 'signup'"
                (click)="mode.set('signup'); sync.error.set('')"
              >
                Create account
              </button>
            </div>

            <form class="form" (submit)="submit()">
              <input
                type="email"
                name="email"
                placeholder="Email"
                [(ngModel)]="email"
                autocomplete="email"
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                [(ngModel)]="password"
                [attr.autocomplete]="mode() === 'signup' ? 'new-password' : 'current-password'"
                minlength="6"
                required
              />
              @if (sync.error()) {
                <p class="error" role="alert">{{ sync.error() }}</p>
              }
              <button type="submit" class="btn primary" [disabled]="sync.busy()">
                <span class="spinner" [class.show]="sync.busy()"></span>
                {{ mode() === 'signin' ? 'Sign in' : 'Create account' }}
              </button>
            </form>

            <div class="divider"><span>or</span></div>

            <button type="button" class="btn google" (click)="sync.signInWithGoogle()">
              <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.97 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              Continue with Google
            </button>
          }
        </div>
      </div>
    }
  `,
})
export class AuthDialog {
  protected readonly sync = inject(SyncService);
  protected readonly mode = signal<'signin' | 'signup'>('signin');
  protected email = '';
  protected password = '';

  close(): void {
    this.sync.authDialogOpen.set(false);
    this.sync.error.set('');
    this.password = '';
  }

  protected submit(): void {
    if (!this.email || this.password.length < 6) return;
    if (this.mode() === 'signup') {
      void this.sync.signUp(this.email, this.password);
    } else {
      void this.sync.signIn(this.email, this.password);
    }
  }

  protected initials(email: string): string {
    const prefix = email.split('@')[0] || 'K';
    return prefix.slice(0, 2).toUpperCase();
  }

  protected statusLabel(): string {
    switch (this.sync.status()) {
      case 'syncing':
        return 'Syncing…';
      case 'synced':
        return 'Synced';
      case 'error':
        return 'Sync error';
      default:
        return 'Signed in';
    }
  }
}