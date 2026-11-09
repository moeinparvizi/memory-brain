const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
require('@angular/compiler');
const { Injector, runInInjectionContext } = require('@angular/core');
const { of } = require('rxjs');

// Load the real component classes with TypeScript's normal decorator transform.
const loaded = new Map();
let authSdk;
function loadTs(relative) {
  const file = path.resolve(__dirname, relative);
  if (loaded.has(file)) return loaded.get(file).exports;
  const compiled = new Module(file, module);
  loaded.set(file, compiled);
  compiled.filename = file;
  compiled.paths = Module._nodeModulePaths(path.dirname(file));
  const requireModule = compiled.require.bind(compiled);
  compiled.require = name => {
    if (name === 'firebase/auth' && authSdk) return authSdk;
    const source = path.resolve(path.dirname(file), name + '.ts');
    return name.startsWith('.') && fs.existsSync(source) ? loadTs(source) : requireModule(name);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true } }).outputText, file);
  return compiled.exports;
}
const { LocaleService } = loadTs('../src/app/core/services/locale.service.ts');
const { AuthService } = loadTs('../src/app/core/services/auth.service.ts');
const { FirebaseAuthService } = loadTs('../src/app/core/services/firebase-auth.service.ts');
const { Router } = require('@angular/router');
const { LoginComponent } = loadTs('../src/app/features/login/login.component.ts');
function login(firebase = {}, auth = {}) {
  const routes = [];
  const c = runInInjectionContext(Injector.create({providers: [
    {provide: LocaleService, useValue: {t: v => v}},
    {provide: FirebaseAuthService, useValue: {available: true, clear: async () => {}, ...firebase}},
    {provide: AuthService, useValue: {isLoggedIn: () => false, ...auth}},
    {provide: Router, useValue: {navigate: v => routes.push(v)}}
  ]}), () => new LoginComponent());
  c.email = 'reader@example.com'; c.emailPassword = 'long-enough-password';
  return {c, routes};
}
test('registration waits for verification and never exchanges an unverified identity', async () => {
  let exchanges = 0;
  const {c, routes} = login({register: async () => {}, resend: async () => {}, verifiedToken: async () => null}, {firebaseLogin: () => { exchanges++; return of({}); }});
  c.mode.set('signup'); await c.submitEmail();
  assert.equal(c.pendingEmail(), 'reader@example.com');
  assert.equal(c.resendSeconds(), 60);
  await c.checkVerification();
  assert.equal(exchanges, 0); assert.equal(routes.length, 0);
  c.ngOnDestroy();
});
test('verification refresh exchanges the verified token before navigating', async () => {
  let received;
  const {c, routes} = login({verifiedToken: async () => 'verified'}, {firebaseLogin: token => { received = token; return of({}); }});
  c.pendingEmail.set(c.email); await c.checkVerification();
  assert.equal(received, 'verified'); assert.deepEqual(routes, [['/dashboard']]);
});
test('verification resend respects cooldown and account change clears pending state', async () => {
  let sends = 0;
  const {c} = login({resend: async () => { sends++; }, clear: async () => {}});
  c.resendSeconds.set(10); await c.resendVerification(); assert.equal(sends, 0);
  c.resendSeconds.set(0); await c.resendVerification(); assert.equal(sends, 1);
  c.pendingEmail.set(c.email); await c.changeAccount(); assert.equal(c.pendingEmail(), null);
  c.ngOnDestroy();
});
test('Google popup cancellation leaves the form usable without application login', async () => {
  const {c, routes} = login({google: async () => {throw {code: 'auth/popup-closed-by-user'};}});
  await c.googleLogin(); assert.equal(c.loading(), false); assert.equal(routes.length, 0); assert.equal(c.error(), null);
});
test('demo login always sends the published sample credentials', () => {
  let credentials;
  const {c, routes} = login({}, {login: (...values) => {credentials = values; return of({});}});
  c.demoLogin(); assert.deepEqual(credentials, ['demo', 'demo1234']); assert.deepEqual(routes, [['/dashboard']]);
});

test('Firebase service refreshes verification and never returns a token for an unverified user', async () => {
  let refreshed = 0; let tokens = 0;
  authSdk = {reload: async () => {refreshed++;}, getIdToken: async (user, force) => {assert.equal(force, true); tokens++; return 'fresh';}};
  const service = new FirebaseAuthService();
  const user = {emailVerified: false}; service.authPromise = Promise.resolve({currentUser: user});
  // Supply already initialized auth to isolate the identity verification boundary.
  service.auth = async () => service.authPromise;
  assert.equal(await service.verifiedToken(), null); assert.equal(tokens, 0);
  user.emailVerified = true;
  assert.equal(await service.verifiedToken(), 'fresh'); assert.equal(refreshed, 2); assert.equal(tokens, 1);
});
test('missing Firebase configuration is unavailable and cannot initialize authentication', async () => {
  const service = new FirebaseAuthService(); assert.equal(service.available, false);
  await assert.rejects(service.auth(), error => error.code === 'auth/unavailable');
});
