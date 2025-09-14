<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	import { onMount } from 'svelte';
	import { getSocket } from './stores';

	onMount(() => {
		getSocket(); // establishes singleton connection
	});

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>


<div class="main">
	{@render children?.()}
</div>



<style>
	.main {
		background-image: url("/bg.png");
		width: 100dvw;
		height: 100dvh;
		background-size: cover;

		margin: 0;
	}
</style>
