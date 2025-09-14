<script lang="ts">
	import { onMount } from "svelte";

    export let index: number;
    export let desc: string;
    export let isActive: boolean;

	  export let onref: (p: { index: number; el: HTMLElement }) => void = () => {};

	let el: HTMLElement;

	onMount(() => {
		onref({ index, el: el });
	});
</script>

<div class="card" bind:this={el} data-active={isActive}>
    <p class="step">Step {index}</p>
    <p style:font-weight=300>{desc}</p>
</div>

<style>
    .card {
        font-family: "Metric";
        background-color: white;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-content: center;
        font-size: 28px;
        letter-spacing: -2%;
		line-height: 28px;
        width: 100%;
        padding: 28px;
        border-radius: 8px;
		opacity: 30%;
    }

	.card[data-active=true] {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		opacity: 100%;
	}

    .step {
        font-weight: 500;
		margin-bottom: 12px;
    }
</style>
