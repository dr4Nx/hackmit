<script lang="ts">
    export let currIdx = 0;
    export let totalSteps = 1;

    $: percentage = totalSteps > 0 ? Math.max( 0, Math.min(100, Math.round(((currIdx + 1) / totalSteps) * 100))) : 1;

	import Timer from "./Timer.svelte";
	let timerRef;

</script>

<div class="container">
    <div class="bar">
        <div class="fill" style={`width: ${percentage}%`}></div>
    </div>

    <p style:letter-spacing=-4%>{currIdx < 0 ? "-" : currIdx + 1} / {totalSteps}</p>

	<hr style:height=18px>

	<p><Timer bind:this={timerRef} autostart={true} startFrom={0} /></p>
</div>

<style>
    .container {
        display: flex;
        justify-content: start;
        align-items: center;
        flex-direction: row;
        width: 100%;
        gap: 16px;
        padding: 0;
    }

    .bar {
		width: 100%;
        background-color: var(--cdark20);
        height: 6px;
        border-radius: 3px;
        display: flex;
        align-items: start;
        justify-content: start;
    }

    .fill {
        background-color: var(--cdark);
        height: 6px;
        border-radius: 3px;
        transition: width 0.3s ease;
    }

	p {
		white-space: nowrap;
		font-family: "Metric";
		font-size: 18px;
		transform: translateY(-1px);
	}
</style>
