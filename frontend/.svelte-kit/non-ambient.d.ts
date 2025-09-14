
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/api" | "/api/inference";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/": Record<string, never>;
			"/api": Record<string, never>;
			"/api/inference": Record<string, never>
		};
		Pathname(): "/" | "/api" | "/api/" | "/api/inference" | "/api/inference/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/bg.png" | "/fonts/signifier/otf/Signifier-Black.otf" | "/fonts/signifier/otf/Signifier-BlackItalic.otf" | "/fonts/signifier/otf/Signifier-Bold.otf" | "/fonts/signifier/otf/Signifier-BoldItalic.otf" | "/fonts/signifier/otf/Signifier-Extralight.otf" | "/fonts/signifier/otf/Signifier-ExtralightItalic.otf" | "/fonts/signifier/otf/Signifier-Light.otf" | "/fonts/signifier/otf/Signifier-LightItalic.otf" | "/fonts/signifier/otf/Signifier-Medium.otf" | "/fonts/signifier/otf/Signifier-MediumItalic.otf" | "/fonts/signifier/otf/Signifier-Regular.otf" | "/fonts/signifier/otf/Signifier-RegularItalic.otf" | "/fonts/signifier/otf/Signifier-Thin.otf" | "/fonts/signifier/otf/Signifier-ThinItalic.otf" | "/remy.svg" | "/robots.txt" | string & {};
	}
}