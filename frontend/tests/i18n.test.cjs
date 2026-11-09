const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
require('@angular/compiler');
const { Injector, runInInjectionContext } = require('@angular/core');
const { of } = require('rxjs');
const { DOCUMENT } = require('@angular/common');

// Load the real component classes with TypeScript's normal decorator transform.
const loaded = new Map();
function loadTs(relative) {
  const file = path.resolve(__dirname, relative);
  if (loaded.has(file)) return loaded.get(file).exports;
  const compiled = new Module(file, module);
  loaded.set(file, compiled);
  compiled.filename = file;
  compiled.paths = Module._nodeModulePaths(path.dirname(file));
  const requireModule = compiled.require.bind(compiled);
  compiled.require = name => {
    const source = path.resolve(path.dirname(file), name + '.ts');
    return name.startsWith('.') && fs.existsSync(source) ? loadTs(source) : requireModule(name);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true } }).outputText, file);
  return compiled.exports;
}

function locale(stored = null, blocked = false) {
  const { LocaleService } = loadTs('../src/app/core/services/locale.service.ts');
  const attrs = {};
  const storage = new Map(stored ? [['memory-brain-language', stored]] : []);
  const doc = {documentElement: {setAttribute: (k,v) => attrs[k] = v}, title: '',
    defaultView: {localStorage: {getItem: k => { if (blocked) throw Error('blocked'); return storage.get(k); }, setItem: (k,v) => { if (blocked) throw Error('blocked'); storage.set(k,v); }}},
    querySelector: () => null};
  const service = runInInjectionContext(Injector.create({ providers: [{provide: DOCUMENT, useValue: doc}] }), () => new LocaleService());
  return { service, attrs, storage };
}
test('English selection changes document direction and persists across reloads', () => {
  const {service, attrs, storage} = locale();
  assert.equal(service.language(), 'fa');
  service.setLanguage('en');
  assert.equal(service.t('داشبورد'), 'Dashboard');
  assert.equal(attrs.lang, 'en');
  assert.equal(attrs.dir, 'ltr');
  assert.equal(storage.get('memory-brain-language'), 'en');
  assert.equal(locale('en').service.language(), 'en');
  service.setLanguage('fa');
  assert.equal(attrs.dir, 'rtl');
  assert.equal(service.t('داشبورد'), 'داشبورد');
});
test('blocked storage and unsupported saved language fall back safely', () => {
  assert.equal(locale('de').service.language(), 'fa');
  const {service} = locale(null, true);
  service.setLanguage('en');
  assert.equal(service.language(), 'en');
});
test('locale formats numbers and dates while preserving currency and user content', () => {
  const {service} = locale('en');
  assert.equal(service.number(1234.5), '1,234.5');
  assert.equal(service.t('تومان'), 'toman');
  assert.equal(service.t('کاربر: Alice'), 'کاربر: Alice');
  assert.match(service.date(new Date(2026, 10, 9, 12), 'full'), /November/);
  service.setLanguage('fa');
  assert.equal(service.number(1234), '۱٬۲۳۴');
});
test('translated messages interpolate parameters without treating them as markup', () => {
  const {service} = locale('en');
  assert.equal(service.t('هدف هفتگی: {count} روز', {count: 4}), 'Weekly goal: 4 days');
});

test('all declared interface translations exist and preserve named parameters', () => {
  const {EN} = loadTs('../src/app/core/i18n/en.ts');
  const root = path.resolve(__dirname, '../src/app');
  for (const relative of fs.readdirSync(root, {recursive: true}).filter(file => file.endsWith('.ts'))) {
    const source = fs.readFileSync(path.join(root, relative), 'utf8');
    for (const match of source.matchAll(/i18n\.t\('([^'\\]*(?:\\.[^'\\]*)*)'/g)) {
      const message = match[1].replace(/\\'/g, "'");
      assert.ok(EN[message], `${relative}: missing English message ${message}`);
    }
  }
  for (const [message, english] of Object.entries(EN)) {
    const params = value => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
    assert.deepEqual(params(english), params(message), `Parameter mismatch in ${message}`);
  }
});

test('goal options use singular English for one day and Persian numerals in Persian', () => {
  const {service} = locale('en');
  assert.equal(service.t('{p0} روز', {p0: 1}), '1 day');
  assert.equal(service.t('{p0} روز', {p0: 4}), '4 days');
  service.setLanguage('fa');
  assert.equal(service.t('{p0} روز', {p0: 4}), '۴ روز');
});

test('login translates real invalid OTP and credential responses in either language', () => {
  const {LoginComponent} = loadTs('../src/app/features/login/login.component.ts');
  const {AuthService} = loadTs('../src/app/core/services/auth.service.ts');
  const {Router} = require('@angular/router');
  const {NgZone} = require('@angular/core');
  const {throwError} = require('rxjs');
  const {service} = locale('en');
  const login = runInInjectionContext(Injector.create({providers: [
    {provide: loadTs('../src/app/core/services/locale.service.ts').LocaleService, useValue: service},
    {provide: loadTs('../src/app/core/services/firebase-auth.service.ts').FirebaseAuthService, useValue: {available: false}},
    {provide: AuthService, useValue: {
      verifyOtp: () => throwError(() => ({error: {error: 'کد تایید نامعتبر یا منقضی شده است'}})),
      login: () => throwError(() => ({error: {error: 'Invalid credentials'}}))
    }},
    {provide: Router, useValue: {}}, {provide: NgZone, useValue: {}}
  ]}), () => new LoginComponent());
  login.otpCode = '123456';
  login.verifyOtp();
  assert.equal(service.t(login.error()), 'The verification code is invalid or has expired');
  login.username = 'example'; login.password = 'invalid';
  login.login();
  assert.equal(service.t(login.error()), 'Invalid username or password');
  service.setLanguage('fa');
  assert.equal(service.t(login.error()), 'نام کاربری یا رمز عبور نادرست است');
});
