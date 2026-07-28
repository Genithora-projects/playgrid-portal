/**
 * Oyun SDK (FR-024, T-12).
 *
 * Bagimliligi olmayan, minimal yardimci paket. Oyun motoru DEGIL;
 * fizik/render/sahne grafigi icermez. Oyun, istedigi yardimciyi ayri
 * ayri import edebilir.
 *
 * Bu dosya hem server tarafinda (Astro tarafindan bundle edilir) hem
 * client tarafinda (iframe tarafindan /sdk/sdk.mjs olarak) kullanilir.
 * JSDoc tipleri ile editor/IDE tip korumasi saglanir.
 *
 * Performans butcesi ile uyumlu olmak icin Zod KULLANILMAZ (Zod bundle
 * ~13KB gzip); runtime dogrulama el ile type-guards ile yapilir.
 */

const VERSION = 1;

/**
 * @typedef {{ v: 1, type: 'ready' } |
 *   { v: 1, type: 'score', value: number, ts: number } |
 *   { v: 1, type: 'gameover', finalScore: number, stats?: Record<string, number|string> } |
 *   { v: 1, type: 'progress', data: Record<string, unknown> }} GameMessage
 *
 * @typedef {{ v: 1, type: 'pause' } |
 *   { v: 1, type: 'resume' } |
 *   { v: 1, type: 'mute' } |
 *   { v: 1, type: 'unmute' } |
 *   { v: 1, type: 'restore', progress: Record<string, unknown> | null }} ShellMessage
 *
 * @typedef {{ kind: 'left'|'right'|'up'|'down'|'action'|'pause', pressed: boolean, ts: number }} NormalizedInput
 */

function isRecord(v) {
	return typeof v === 'object' && v !== null;
}

function send(parent, msg) {
	parent.postMessage(msg, '*');
}

/* ---------- Type guards ---------- */

/**
 * @param {unknown} m
 * @returns {m is GameMessage}
 */
export function isGameMessage(m) {
	if (!isRecord(m)) return false;
	if (m['v'] !== VERSION) return false;
	switch (m['type']) {
		case 'ready':
			return true;
		case 'score':
			return typeof m['value'] === 'number' && typeof m['ts'] === 'number';
		case 'gameover': {
			if (typeof m['finalScore'] !== 'number') return false;
			const stats = m['stats'];
			if (stats === undefined) return true;
			if (!isRecord(stats)) return false;
			for (const v of Object.values(stats)) {
				if (typeof v !== 'number' && typeof v !== 'string') return false;
			}
			return true;
		}
		case 'progress':
			return isRecord(m['data']);
		default:
			return false;
	}
}

/**
 * @param {unknown} m
 * @returns {m is ShellMessage}
 */
export function isShellMessage(m) {
	if (!isRecord(m)) return false;
	if (m['v'] !== VERSION) return false;
	switch (m['type']) {
		case 'pause':
		case 'resume':
		case 'mute':
		case 'unmute':
			return true;
		case 'restore': {
			const p = m['progress'];
			return p === null || isRecord(p);
		}
		default:
			return false;
	}
}

/**
 * @param {MessageEvent} event
 * @param {Window | null | undefined} expected
 * @returns {boolean}
 */
export function isFromWindow(event, expected) {
	return !!expected && event.source === expected;
}

/* ---------- Oyun tarafi (iframe ici) ---------- */

/**
 * @typedef {{ slug: string, sdkVersion: number, parent?: Window | null,
 *   onPause?: () => void, onResume?: () => void,
 *   onMute?: (muted: boolean) => void,
 *   onRestore?: (progress: Record<string, unknown> | null) => void }} GameOptions
 *
 * @typedef {{ ready: () => void,
 *   reportScore: (value: number) => void,
 *   reportProgress: (data: Record<string, unknown>) => void,
 *   reportGameover: (finalScore: number, stats?: Record<string, number|string>) => void }} GameApi
 */

/**
 * Oyun tarafi API. iframe icinden kabuk ile konusur. Kabuk event.source
 * referans esitligi ile mesajin gercekten bu iframe'den geldigini dogrular.
 *
 * @param {GameOptions} options
 * @returns {GameApi}
 */
export function createGame(options) {
	const parent = options.parent ?? (typeof window !== 'undefined' ? window.parent : null);
	if (!parent) {
		throw new Error('SDK: no parent window available');
	}

	if (typeof window !== 'undefined') {
		window.addEventListener('message', (event) => {
			if (event.source !== parent) return;
			const data = event.data;
			if (typeof data !== 'object' || data === null) return;
			switch (data.type) {
				case 'pause':
					options.onPause?.();
					break;
				case 'resume':
					options.onResume?.();
					break;
				case 'mute':
					options.onMute?.(true);
					break;
				case 'unmute':
					options.onMute?.(false);
					break;
				case 'restore': {
					const p = data.progress;
					options.onRestore?.(p === null || typeof p === 'object' ? p : null);
					break;
				}
			}
		});
	}

	return {
		ready() {
			send(parent, { v: VERSION, type: 'ready' });
		},
		reportScore(value) {
			send(parent, { v: VERSION, type: 'score', value, ts: Date.now() });
		},
		reportProgress(data) {
			send(parent, { v: VERSION, type: 'progress', data });
		},
		reportGameover(finalScore, stats) {
			if (stats) {
				send(parent, { v: VERSION, type: 'gameover', finalScore, stats });
			} else {
				send(parent, { v: VERSION, type: 'gameover', finalScore });
			}
		},
	};

	void options.slug;
}

/* ---------- Kabuk tarafi ---------- */

/**
 * @typedef {{ onReady?: () => void,
 *   onScore?: (value: number, ts: number) => void,
 *   onGameover?: (finalScore: number, stats?: Record<string, number|string>) => void,
 *   onProgress?: (data: Record<string, unknown>) => void }} ShellHandlers
 *
 * @typedef {{ send: (msg: ShellMessage) => void,
 *   pause: () => void, resume: () => void,
 *   mute: () => void, unmute: () => void,
 *   restore: (progress: Record<string, unknown> | null) => void,
 *   destroy: () => void }} ShellApi
 */

/**
 * iframe'i dinlemeye baslatir; bir ShellApi doner.
 *
 * @param {HTMLIFrameElement} iframe
 * @param {ShellHandlers} [handlers]
 * @returns {ShellApi | null}
 */
export function attachShell(iframe, handlers = {}) {
	const win = iframe.contentWindow;
	if (!win) return null;

	function handler(event) {
		if (!isFromWindow(event, win)) return;
		if (!isGameMessage(event.data)) return;
		switch (event.data.type) {
			case 'ready':
				handlers.onReady?.();
				break;
			case 'score':
				handlers.onScore?.(event.data.value, event.data.ts);
				break;
			case 'gameover':
				handlers.onGameover?.(event.data.finalScore, event.data.stats);
				break;
			case 'progress':
				handlers.onProgress?.(event.data.data);
				break;
		}
	}

	window.addEventListener('message', handler);

	function sendShell(msg) {
		if (!win) return;
		win.postMessage(msg, '*');
	}

	return {
		send: sendShell,
		pause() { sendShell({ v: VERSION, type: 'pause' }); },
		resume() { sendShell({ v: VERSION, type: 'resume' }); },
		mute() { sendShell({ v: VERSION, type: 'mute' }); },
		unmute() { sendShell({ v: VERSION, type: 'unmute' }); },
		restore(progress) { sendShell({ v: VERSION, type: 'restore', progress }); },
		destroy() { window.removeEventListener('message', handler); },
	};
}

/**
 * Tek seferlik mesaj bekleme. Ready gibi belli bir mesaj tipi icin pratik.
 *
 * @param {HTMLIFrameElement} iframe
 * @param {(m: unknown) => boolean} predicate
 * @param {number} [timeoutMs=8000]
 * @returns {Promise<unknown>}
 */
export function awaitMessage(iframe, predicate, timeoutMs = 8000) {
	const win = iframe.contentWindow;
	if (!win) return Promise.reject(new Error('iframe.contentWindow unavailable'));

	return new Promise((resolve, reject) => {
		const t = window.setTimeout(() => {
			window.removeEventListener('message', onMessage);
			reject(new Error(`awaitMessage: timeout after ${timeoutMs}ms`));
		}, timeoutMs);

		function onMessage(event) {
			if (!isFromWindow(event, win)) return;
			if (!isGameMessage(event.data) && !isShellMessage(event.data)) {
				if (!predicate(event.data)) return;
			}
			if (!predicate(event.data)) return;
			window.clearTimeout(t);
			window.removeEventListener('message', onMessage);
			resolve(event.data);
		}
		window.addEventListener('message', onMessage);
	});
}

/* ---------- Utility: fixed timestep loop ---------- */

/**
 * @typedef {{ stepHz?: number, maxStepsPerFrame?: number,
 *   onUpdate?: (dtSeconds: number) => void,
 *   onFrame?: (interpAlpha: number) => void }} LoopOptions
 *
 * @typedef {{ tick: () => void, stop: () => void, isRunning: () => boolean }} LoopHandle
 */

/**
 * Fixed timestep + accumulator, oyun hizinin framerate'den bagimsiz
 * olmasini saglar. Spiral-of-death guard: catch-up limit 5 steps.
 *
 * @param {LoopOptions} opts
 * @returns {LoopHandle}
 */
export function fixedTimestep(opts) {
	const stepMs = 1000 / (opts.stepHz ?? 60);
	const maxSteps = opts.maxStepsPerFrame ?? 5;
	let last = 0;
	let acc = 0;
	let running = false;
	let raf = 0;

	const loop = (now) => {
		if (!running) return;
		raf = requestAnimationFrame(loop);
		if (last === 0) last = now;
		const dt = Math.min(now - last, 250);
		last = now;
		acc += dt;
		let steps = 0;
		while (acc >= stepMs && steps < maxSteps) {
			opts.onUpdate?.(stepMs / 1000);
			acc -= stepMs;
			steps++;
		}
		if (steps >= maxSteps && acc >= stepMs) acc = stepMs;
		opts.onFrame?.(Math.min(1, acc / stepMs));
	};

	return {
		tick() {
			if (running) return;
			running = true;
			last = 0;
			acc = 0;
			raf = requestAnimationFrame(loop);
		},
		stop() {
			running = false;
			cancelAnimationFrame(raf);
		},
		isRunning() { return running; },
	};
}

/* ---------- Utility: input normalization ---------- */

const KEY_MAP = {
	ArrowLeft: 'left', a: 'left', A: 'left',
	ArrowRight: 'right', d: 'right', D: 'right',
	ArrowUp: 'up', w: 'up', W: 'up',
	ArrowDown: 'down', s: 'down', S: 'down',
	' ': 'action', Enter: 'action',
	Escape: 'pause', p: 'pause', P: 'pause',
};

/**
 * @typedef {'left'|'right'|'up'|'down'|'action'|'pause'} InputKind
 *
 * @typedef {{ detach: () => void }} InputHandle
 */

/**
 * Klavye + touch normalizasyonu. Emit edilen CustomEvent 'game-input'.
 *
 * @param {HTMLElement | Window} [target=window]
 * @returns {InputHandle}
 */
export function attachInput(target = window) {
	const pressed = new Set();
	const host = target;
	const canvasOrWin = window;

	function emit(kind, value) {
		if (pressed.has(kind) === value) return;
		if (value) pressed.add(kind); else pressed.delete(kind);
		const detail = { kind, pressed: value, ts: performance.now() };
		host.dispatchEvent(new CustomEvent('game-input', { detail }));
	}

	function onKey(e) {
		const k = KEY_MAP[e.key];
		if (!k) return;
		emit(k, e.type === 'keydown');
		if (k !== 'pause') e.preventDefault();
	}

	function onTouchStart() { emit('action', true); }
	function onTouchEnd() { emit('action', false); }
	function onBlur() {
		for (const k of Array.from(pressed)) emit(k, false);
	}

	canvasOrWin.addEventListener('keydown', onKey);
	canvasOrWin.addEventListener('keyup', onKey);
	host.addEventListener('touchstart', onTouchStart, { passive: true });
	host.addEventListener('touchend', onTouchEnd);
	canvasOrWin.addEventListener('blur', onBlur);

	return {
		detach() {
			canvasOrWin.removeEventListener('keydown', onKey);
			canvasOrWin.removeEventListener('keyup', onKey);
			host.removeEventListener('touchstart', onTouchStart);
			host.removeEventListener('touchend', onTouchEnd);
			canvasOrWin.removeEventListener('blur', onBlur);
		},
	};
}
