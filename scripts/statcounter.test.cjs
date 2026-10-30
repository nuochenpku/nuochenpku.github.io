const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'scripts.js'), 'utf8');

function setup({ origin = 'https://nuochenpku.github.io', privacy = false, dnt = false } = {}) {
  const elements = new Map();
  const images = [];
  const scripts = [];
  const timers = new Map();
  const windowEvents = {};
  let timerId = 0;
  for (const id of ['visitor-counter', 'visitor-count', 'visitor-counter-status', 'visitor-counter-retry']) {
    elements.set(id, {
      dataset: {}, textContent: '—', hidden: true, disabled: false, children: [], events: {},
      addEventListener(name, fn) { this.events[name] = fn; },
      replaceChildren(...children) { this.children = children; }
    });
  }
  const context = {
    URL, Date, console,
    navigator: { globalPrivacyControl: privacy, doNotTrack: dnt ? '1' : '0' },
    document: {
      addEventListener() {}, getElementById: id => elements.get(id),
      createElement: tag => ({ tag }), head: { appendChild: script => scripts.push(script) }
    },
    window: {
      location: { origin }, addEventListener: (name, fn) => { windowEvents[name] = fn; },
      setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, delay }); return id; },
      clearTimeout(id) { timers.delete(id); }
    },
    Image: class {
      constructor() { this.naturalWidth = 40; this.naturalHeight = 16; images.push(this); }
    }
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  context.initializeVisitorCounter();
  return { context, elements, images, scripts, timers, windowEvents };
}

test('production uses the supplied tracking image once without third-party scripts', () => {
  const h = setup();
  h.context.initializeVisitorCounter();
  assert.equal(h.scripts.length, 0);
  assert.equal(h.images.length, 1);
  assert.equal(new URL(h.images[0].src).pathname, '/13363945/0/79502997/0/');
  assert.equal(h.images[0].referrerPolicy, 'strict-origin-when-cross-origin');
});

test('file, localhost, and non-production previews never run tracking', () => {
  for (const origin of ['null', 'http://localhost:8000', 'https://preview.example']) {
    const h = setup({ origin });
    assert.equal(h.scripts.length, 0);
    assert.equal(new URL(h.images[0].src).searchParams.get('displayonly'), '1');
  }
});

test('privacy signals suppress tracking but allow reading aggregate counts', () => {
  for (const options of [{ privacy: true }, { dnt: true }]) {
    const h = setup(options);
    assert.equal(h.scripts.length, 0);
    assert.equal(h.images.length, 1);
    assert.equal(new URL(h.images[0].src).searchParams.get('displayonly'), '1');
  }
});

test('successful reads show the image and retries never add a tracking request', () => {
  const h = setup();
  h.images[0].onload();
  assert.equal(h.elements.get('visitor-count').children[0], h.images[0]);
  assert.equal(h.elements.get('visitor-counter-retry').hidden, true);
  h.elements.get('visitor-counter-retry').events.click();
  h.windowEvents.online();
  assert.equal(h.scripts.length, 0);
  for (const image of h.images.slice(1)) {
    const url = new URL(image.src);
    assert.equal(url.hostname, 'c.statcounter.com');
    assert.equal(url.searchParams.get('sc_project'), '13363945');
    assert.equal(url.searchParams.get('displayonly'), '1');
  }
});

test('a hidden 1x1 counter is treated as unconfigured, not a successful count', () => {
  const h = setup({ origin: 'null' });
  h.images[0].naturalWidth = h.images[0].naturalHeight = 1;
  h.images[0].onload();
  assert.equal(h.elements.get('visitor-count').children.length, 0);
  assert.match(h.elements.get('visitor-counter-status').textContent, /not enabled/);
  assert.equal(h.elements.get('visitor-counter-retry').hidden, false);
});

test('a failed refresh preserves the last rendered total', () => {
  const h = setup();
  h.images[0].onload();
  h.elements.get('visitor-counter-retry').events.click();
  h.images[1].onerror();
  assert.equal(h.elements.get('visitor-count').children[0], h.images[0]);
  assert.match(h.elements.get('visitor-counter-status').textContent, /Last loaded total/);
});

test('timeouts expose retry, and late or stale responses cannot overwrite newer data', () => {
  const h = setup();
  const lateLoad = h.images[0].onload;
  h.windowEvents.online();
  h.images[1].onload();
  lateLoad();
  assert.equal(h.elements.get('visitor-count').children[0], h.images[1]);
  h.elements.get('visitor-counter-retry').events.click();
  [...h.timers.values()].find(timer => timer.delay === 8000).fn();
  assert.equal(h.elements.get('visitor-counter-retry').hidden, false);
  assert.equal(h.elements.get('visitor-counter-retry').disabled, false);
  assert.equal(h.images[2].onload, null);
});

test('failed tracking falls back to a read without duplicating the visit', () => {
  const h = setup();
  h.images[0].onerror();
  assert.equal(h.scripts.length, 0);
  assert.equal(h.images.length, 2);
  assert.equal(new URL(h.images[1].src).searchParams.get('displayonly'), '1');
});
