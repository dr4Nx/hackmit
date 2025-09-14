<script>
import { onMount, onDestroy } from "svelte";

// Optional props
export let autostart = true;   // start automatically on mount
export let startFrom = 0;      // starting seconds offset (integer >= 0)

let display = "00:00";

// Internal state
let _interval = null;
let _startEpochMs = 0;
let _startOffsetSec = 0;

// ---- formatting: mm:ss with padded 0s for mm if < 10, and for ss always ----
function format(secondsTotal) {
	const minutes = Math.floor(secondsTotal / 60);
	const seconds = Math.floor(secondsTotal % 60);
	const mm = minutes < 10 ? `0${minutes}` : String(minutes);
	const ss = seconds < 10 ? `0${seconds}` : String(seconds);
	return `${mm}:${ss}`;
}

function tick() {
	// compute elapsed using wall time to avoid setInterval drift
	const elapsedSec = ((Date.now() - _startEpochMs) / 1000) + _startOffsetSec;
	const whole = Math.max(0, Math.floor(elapsedSec));
	display = format(whole);
}

// ---- controls (callable from parent via bind:this or imports) ----
export function start() {
	stop();
	_startEpochMs = Date.now();
	_startOffsetSec = startFrom;
	tick(); // update immediately
	_interval = setInterval(tick, 250); // 4 Hz; shown value still increments by whole seconds
}

export function stop() {
	if (_interval) {
		clearInterval(_interval);
		_interval = null;
	}
}

export function reset(toSeconds = 0) {
	stop();
	startFrom = Math.max(0, Math.floor(toSeconds));
	display = format(startFrom);
}

onMount(() => {
	display = format(startFrom);
	if (autostart) start();
});

onDestroy(stop);
</script>

<span aria-live="polite" aria-atomic="true">{display}</span>

<style>
	span {
		font-variant-numeric: tabular-nums;
	}
</style>

