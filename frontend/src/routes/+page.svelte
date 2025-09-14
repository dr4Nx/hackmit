<script lang="ts">
    import { goto } from "$app/navigation";
    import { MoveRight } from "@lucide/svelte";
    import { recipe, metadata, steps } from "./stores";

    let loading = false;

    const processRecipe = async () => {
        const response = await fetch(`http://127.0.0.1:8000/process-recipe`, {
            method: "POST",
            body: JSON.stringify({
                recipe: $recipe.trim(),
            }),
            headers: {
                "Content-Type": "application/json",
            },
        });

        const { data } = await response.json();
        return data;
    };

    const extractMetadata = async (processedRecipe: string) => {
        const response = await fetch(`http://127.0.0.1:8000/extract-metadata`, {
            method: "POST",
            body: JSON.stringify({
                recipe: processedRecipe,
            }),
            headers: {
                "Content-Type": "application/json",
            },
        });

        const { data } = await response.json();
        metadata.set(data);
    };

    const extractSteps = async (processedRecipe: string) => {
        const response = await fetch(`http://127.0.0.1:8000/extract-steps`, {
            method: "POST",
            body: JSON.stringify({
                recipe: processedRecipe,
            }),
            headers: {
                "Content-Type": "application/json",
            },
        });

        const { data } = await response.json();
        steps.set(data);
    };

    const submit = async () => {
        loading = true;

        try {
            // First process the recipe
            const processedRecipe = await processRecipe();
            
            // Then extract metadata and steps using the processed recipe
            await Promise.all([
                extractMetadata(processedRecipe),
                extractSteps(processedRecipe)
            ]);

            goto("/overview");
        } catch (error) {
            console.error("Error processing recipe:", error);
        } finally {
            loading = false;
        }
    };

    $: filled = $recipe.trim().length > 0;
</script>

<div class="container">
    <div class="content">
        <button
            style="background: none; outline: none; border: none; cursor: pointer; width: fit-content; height: fit-content;"
            on:click={() => goto("/")}
        >
            <img
                width="82"
                style:margin-bottom="36px"
                src="remy+text.svg"
                alt=""
            />
        </button>

        <div style:margin-bottom="28px">
            <h1 style:font-weight="400" style:margin-bottom="-8px">Welcome,</h1>
            <h1 style:font-weight="300" style:margin-left="4px">
                Let's get cooking.
            </h1>
        </div>

        <p style:margin-bottom="12px">
            Enter in a recipe, and let us do the work for you.
        </p>

        <div class="input-wrapper">
            <textarea
                bind:value={$recipe}
                data-filled={filled}
                placeholder="start entering a recipe..."
            ></textarea>
            <div class="btn-container">
                <button
                    class="submit-btn"
                    type="button"
                    on:mousedown|preventDefault
                    on:click={submit}
                    disabled={loading}
                >
                    <div
                        style:display="flex"
                        style:align-items="center"
                        style:gap="8px"
                    >
                        {#if loading}
                            <div style:width="100px">
                                <span class="spinner" aria-hidden="true"></span>
                            </div>
                        {:else}
                            Get Started
                            <MoveRight
                                strokeWidth="2px"
                                size="18px"
                                color="var(--clight)"
                            />
                        {/if}
                    </div>
                </button>
            </div>
        </div>
    </div>
</div>

<style>
    .content {
        display: flex;

        flex-direction: column;
    }

    .container {
        width: 100dvw;
        height: 100dvh;
        display: grid;
        align-items: center;
        justify-content: center;
        margin: 0;
    }

    h1 {
        font-family: "Signifier";
        font-size: 36px;
        letter-spacing: -1%;
        margin: 0;
    }

    textarea,
    p {
        font-family: "Metric";
        font-size: 22px;
        font-weight: 300;
        margin: 0;
    }

    .input-wrapper {
        position: relative;
        width: 100%;
        max-width: 500px;
    }

    .input-wrapper .btn-container {
        opacity: 0;

        width: 100%;
        display: flex;
        align-items: center;
        justify-content: end;
        background: var(--cwhite75);
        border-radius: 8px;
        height: fit-content;
        border-top-left-radius: 0;
        border-top-right-radius: 0;
        /* z-index: -10; */
        /* margin-top: -2px; */
        padding: 8px;

        transition: opacity 0.2 ease-in-out;
    }

    .input-wrapper textarea {
        resize: none;

        width: 500px;
        height: 42px;
        padding: 10px 18px;

        font-size: 18px;
        font-weight: 300;
        color: var(--cdark);

        border: none;
        border-radius: 8px;
        background: var(--cwhite75);

        outline: none; /* no highlight */
        transition: all 0.25s ease; /* smooth expand */

        box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.02);
    }

    .input-wrapper textarea::placeholder {
        color: var(--cdark40);
        font-weight: 300;
    }

    .input-wrapper:focus-within textarea,
    .input-wrapper[data-filled="true"] textarea {
        height: 180px;
        padding-right: 60px;

        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
        box-shadow: none;
    }

    .input-wrapper .submit-btn {
        /* position: sticky;
        right: 12px;
        bottom: 0px; */
        /* transform: translateY(-0%); */

        height: 30px;
        padding: 0 12px;

        border: none;
        border-radius: 4px;
        background: var(--cdark);
        color: white;
        font-size: 14px;
        cursor: pointer;

        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
    }

    .input-wrapper:focus-within .submit-btn,
    .input-wrapper[data-filled="true"] .submit-btn,
    .input-wrapper:focus-within .btn-container,
    .input-wrapper[data-filled="true"] .btn-container,
    .input-wrapper:focus-within textarea,
    .input-wrapper[data-filled="true"] textarea {
        opacity: 1;
        pointer-events: auto;
    }

    .submit-btn {
        box-shadow: 0px 2px 6px rgba(0, 0, 0, 0.08);
        transition: box-shadow ease-in-out 0.2s;
    }

    .submit-btn[disabled] {
        opacity: 0.7;
        cursor: not-allowed;
        box-shadow: 0px 2px 6px rgba(0, 0, 0, 0);
    }

    .submit-btn:hover {
        box-shadow: 0px 3px 8px rgba(1, 0, 0, 0.16);
        background-color: #000;
    }

    .spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        margin-top: 2px;
        border: 2px solid var(--cdark);
        border-top-color: var(--clight);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
</style>
