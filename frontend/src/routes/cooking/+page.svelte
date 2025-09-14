<script lang="ts">
    import Card from "../../components/card.svelte";
    import Progress from "../../components/progress.svelte";
    import Transcribe from "../../components/transcribe.svelte";

    import { steps, metadata } from "../stores";
    import { onMount, tick } from "svelte";
    import { MoveRight } from "@lucide/svelte";

    import { goto } from "$app/navigation";

    let currIdx = $state(-1);

    let imageBase64 = $state("");
    let vlmoutput = $state("");

    let h1top: HTMLElement;

    import { wsMessage } from "../stores";
    let last: any = null;
    const unsub = wsMessage.subscribe((m) => {
        if (m) {
            console.log(m.event);
            console.log(m.data);

            if (m.event === "step_changed") {
                currIdx = m.data.index;
            } else if (m.event === "image_changed") {
                imageBase64 = `data:image/png;base64,${m.data.data}`;
                vlmoutput = m.data.text;
            }
        }
    });

    let foodData;
    try {
        foodData = JSON.parse($metadata || '{"dish_name": ""}');
    } catch (e) {
        console.error("Error parsing metadata:", e);
        foodData = { dish_name: "" };
    }

    let stepList;
    try {
        stepList = JSON.parse($steps || '{"recipe": []}').recipe;
    } catch (e) {
        console.error("Error parsing steps:", e);
        stepList = { recipe: [] };
    }

    let cardEls = $state([]);
    let translateYpx = $state(0);
    let ro: ResizeObserver | null = null;

    function handleRef({ index, el }: { index: number; el: HTMLElement }) {
        cardEls[index] = el;
        ro?.observe(el);
    }

    $effect(() => {
        const i = currIdx;

        tick().then(() => {
            const el = cardEls[i];
            const lastEl = cardEls[cardEls.length - 1];

            translateYpx =
                el && lastEl && h1top
                    ? Math.min(
                          el.offsetTop,
                          lastEl.offsetTop -
                              window.innerHeight +
                              h1top.offsetTop +
                              96 * 2 +
                              28
                      )
                    : 0;

            console.log(translateYpx);
        });
    });

    onMount(() => {
        const ro = new ResizeObserver(() => {
            tick().then(() => {
                const i = currIdx;
                const el = cardEls[i];
                const lastEl = cardEls[cardEls.length - 1];

                translateYpx =
                    el && lastEl && h1top
                        ? Math.min(
                              el.offsetTop,
                              lastEl.offsetTop -
                                  window.innerHeight +
                                  h1top.offsetTop +
                                  96 * 2 +
                                  28
                          )
                        : 0;
            });
        });

        cardEls.forEach((el) => el && ro.observe(el));

        return () => {
            ro.disconnect();
            unsub?.();
        };
    });

    const backHome = async () => {
        const response = await fetch(`http://127.0.0.1:8000/reset`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        const { ok } = await response.json();

        if (ok) goto("/");
    };
</script>

<dev class="main">
    <div class="left">
        <div class="top-container">
            <button
                style="background: none; outline: none; border: none; cursor: pointer; width: fit-content; height: fit-content;"
                on:click={() => goto("/")}
            >
                <img width="82" src="remy+text.svg" alt="" />
            </button>

            <h1
                bind:this={h1top}
                style:margin-top="18px"
                style:margin-bottom="4px"
                class="title"
            >
                {foodData.dish_name || "Default Name"}
            </h1>
            <Progress {currIdx} totalSteps={stepList.length} />
            <Transcribe transcription={vlmoutput} />
        </div>

        <div class="streaming-container">
            <img src={imageBase64} style:height="550px" alt="" />
            <!-- <div
                style="width: 400px; height: 100px; background-color: #fff;"
            ></div> -->
        </div>
    </div>

    <div class="right">
        <div class="cards" style:transform={`translateY(-${translateYpx}px)`}>
            {#each stepList as step, i}
                <Card
                    onref={handleRef}
                    index={i + 1}
                    desc={step}
                    isActive={i === currIdx}
                ></Card>
            {/each}

            {#if currIdx === stepList.length - 1}
                <div class="done-container">
                    <p class="step">Serve & Enjoy!</p>
                    <button
                        class="submit-btn"
                        type="button"
                        on:mousedown|preventDefault
                        on:click={backHome}
                    >
                        <div
                            style:display="flex"
                            style:align-items="center"
                            style:gap="8px"
                        >
                            Finish
                            <MoveRight
                                strokeWidth="2px"
                                size="18px"
                                color="var(--clight)"
                            />
                        </div>
                    </button>
                </div>
            {/if}
        </div>
    </div>
</dev>

<style>
    .main {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        width: 100vw;
        height: 100%;
        padding: 96px 64px 96px 96px;
        column-gap: 64px;
        overflow: hidden;
    }

    .done-container {
        background-color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-family: "Metric";
        font-size: 28px;
        letter-spacing: -2%;
        line-height: 28px;
        width: 100%;
        height: fit-content;
        padding: 16px 28px;
        border-radius: 8px;
    }

    .top-container {
        display: flex;
        justify-content: center;
        align-items: start;
        flex-direction: column;
        gap: 0;
        width: 100%;
    }

    .title {
        font-family: "Signifier";
        font-size: 48px;
        font-weight: 500;
        margin: 0;
        padding: 0;
    }

    .right,
    .left {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        height: 100%;
        flex: 1;
    }

    .left {
        align-items: start;
        row-gap: 18px;
    }

    .right {
        padding-top: 48px;
    }

    .cards {
        display: flex;
        flex-direction: column;
        row-gap: 24px;

        transition: ease-out 0.5s;
    }

    .streaming-container {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
    }

    .submit-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        column-gap: 4px;

        height: 30px;
        padding: 0 12px;

        border: none;
        border-radius: 4px;
        background: var(--cdark);
        color: var(--clight);
        font-size: 14px;
        cursor: pointer;

        box-shadow: 0px 2px 6px rgba(0, 0, 0, 0.08);
        transition: ease-in-out 0.2s;
    }

    .submit-btn:hover {
        box-shadow: 0px 3px 8px rgba(1, 0, 0, 0.16);
        background-color: #000;
    }
</style>
