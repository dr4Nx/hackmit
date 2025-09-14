<script>
    export let transcription;
</script>

<div class="container">
    {#if transcription}
        <img src="voice.svg" alt="voice" style="width: 24px;" />
        <p>{transcription}</p>
    {/if}
</div>

<style>
    .container {
        font-family: "Metric";
        display: flex;
        width: 100%;
        align-items: start;
        justify-content: start;
        column-gap: 16px;
        padding: 6px 16px;
        border-radius: 8px;
        height: fit-content;

        p {
            font-size: 20px;
        }
    }
</style>
