import { writable } from 'svelte/store';

export const recipe = writable("");
export const metadata = writable("");
export const steps = writable("");


export const wsMessage = writable<any>(null);

let socket: WebSocket | null = null;

export function getSocket(): WebSocket | null {
	if (typeof window === 'undefined') return null; // SSR guard
	if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
		return socket;
	}
	const url = (import.meta.env.VITE_WS_URL as string) ?? 'ws://localhost:8000/ws';
	socket = new WebSocket(url);

	socket.onmessage = (ev) => {
		try { wsMessage.set(JSON.parse(ev.data)); }
		catch { /* ignore malformed */ }
	};
	socket.onclose = () => { /* optional: reconnect logic */ };

	return socket;
}
