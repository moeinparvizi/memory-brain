import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import type { Auth } from 'firebase/auth';

/** Firebase identifies users; only the API may establish an application session. */
@Injectable({ providedIn: 'root' })
export class FirebaseAuthService {
  readonly available = !!environment.firebase && ['apiKey', 'authDomain', 'projectId', 'appId'].every(key => !!(environment.firebase as any)?.[key]);
  private authPromise?: Promise<Auth>;

  private async auth() {
    if (!this.available) throw { code: 'auth/unavailable' };
    return this.authPromise ??= (async () => {
      const [{ initializeApp }, { initializeAuth, inMemoryPersistence, browserPopupRedirectResolver }] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
      return initializeAuth(initializeApp(environment.firebase!, 'public-auth'), { persistence: inMemoryPersistence, popupRedirectResolver: browserPopupRedirectResolver });
    })();
  }

  async register(email: string, password: string) {
    const { createUserWithEmailAndPassword } = await import('firebase/auth');
    await createUserWithEmailAndPassword(await this.auth(), email, password);
  }
  async signIn(email: string, password: string) {
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    await signInWithEmailAndPassword(await this.auth(), email, password);
    return this.verifiedToken();
  }
  async google() {
    const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
    await signInWithPopup(await this.auth(), new GoogleAuthProvider());
    return this.verifiedToken();
  }
  async resend() {
    const { sendEmailVerification } = await import('firebase/auth');
    const user = (await this.auth()).currentUser;
    if (!user) throw { code: 'auth/user-missing' };
    await sendEmailVerification(user);
  }
  async verifiedToken() {
    const { reload, getIdToken } = await import('firebase/auth');
    const user = (await this.auth()).currentUser;
    if (!user) return null;
    await reload(user);
    return user.emailVerified ? getIdToken(user, true) : null;
  }
  async resetPassword(email: string) {
    const { sendPasswordResetEmail } = await import('firebase/auth');
    await sendPasswordResetEmail(await this.auth(), email);
  }
  async clear() {
    if (!this.authPromise) return;
    const { signOut } = await import('firebase/auth');
    await signOut(await this.authPromise);
  }
}
