<script lang="ts">
    let recipe = "";

    const runInference = async () => {
        const response = await fetch(`http://127.0.0.1:8000/extract-steps`, {
            method: "POST",
            body: JSON.stringify({
                recipe,
            }),
            headers: {
                "Content-Type": "application/json",
            },
        });

        // const { prompt, image_url } = await response.json();

        // console.log("prompt", prompt, "image_url", image_url);
    };

    const runNextStep = async () => {
        const response = await fetch(`http://127.0.0.1:8000/next-step`, {
            method: "GET",
            // body: JSON.stringify({
            //     recipe,
            // }),
            headers: {
                "Content-Type": "application/json",
            },
        });

        const { data } = await response.json();

        console.log("next step", data);
    };

    const expandInput = (e: Event) => {
        const target = e.currentTarget as HTMLElement;
        target.classList.replace("h-[50px]", "h-[200px]");
    };

    const shrinkInput = (e: Event) => {
        const target = e.currentTarget as HTMLElement;
        target.classList.replace("h-[200px]", "h-[50px]");
    };
</script>

<main
    class="flex flex-col items-center justify-center min-h-screen w-screen bg-base bg-[url('bg.png')] bg-cover"
>
    <div class="w-2/5 flex flex-col items-start justify-center gap-y-4">
        <img src="remy.svg" alt="remy" />

        <div>
            <h1 class="font-signifier font-bold text-3xl">Welcome</h1>
            <h1 class="font-signifier text-3xl">Let's get started.</h1>
        </div>

        <p class="text-xl font-light">
            Enter in a recipe, and we'll do all the work for you.
        </p>
        <input
            type="text"
            bind:value={recipe}
            placeholder="start entering a recipe..."
            class="w-full text-left p-4 bg-white rounded-md text-grey1 outline-none h-[50px]"
            on:focus={(e) => expandInput(e)}
            on:blur={(e) => shrinkInput(e)}
        />
    </div>

    <button on:click={runInference} class="bg-blue-100">submit</button>
    <button on:click={runNextStep} class="bg-blue-100">next step</button>
</main>
