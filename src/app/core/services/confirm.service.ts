import { Injectable, signal } from '@angular/core';

interface ConfirmState { message: string; resolve: (ok: boolean) => void; }

/** Promise-based confirm dialog: `if (await confirm.ask('...')) { ... }`. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly state = signal<ConfirmState | null>(null);

  ask(message: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => this.state.set({ message, resolve }));
  }

  answer(ok: boolean): void {
    this.state()?.resolve(ok);
    this.state.set(null);
  }
}
