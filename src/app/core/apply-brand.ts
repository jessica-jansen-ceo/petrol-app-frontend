import { CLIENT_CONFIG } from '../config/client.config';

/**
 * Pushes white-label brand colours into CSS custom properties at startup,
 * and sets the document title. Called once from the root component.
 */
export function applyBrand(): void {
  const root = document.documentElement;
  root.style.setProperty('--primary', CLIENT_CONFIG.brand.primaryColor);
  root.style.setProperty('--accent', CLIENT_CONFIG.brand.accentColor);
  document.title = `${CLIENT_CONFIG.brand.appName} — ${CLIENT_CONFIG.brand.tagline}`;
}
