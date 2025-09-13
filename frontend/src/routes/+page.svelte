<script>
    let recipe = "";

    const runInference = async () => {
        const response = await fetch(`http://127.0.0.1:8000/test-inference`, {
            method: "POST",
            body: JSON.stringify({
                prompt: recipe,
                image_url: recipe,
            }),
            headers: {
                "Content-Type": "application/json",
            },
        });

        const { prompt, image_url } = await response.json();

        console.log("prompt", prompt, "image_url", image_url);
    };
</script>

<main class="flex flex-col items-center justify-center min-h-screen w-screen">
    <h1>remy</h1>
    <textarea bind:value={recipe} placeholder="Input recipe..." class="border"
    ></textarea>
    <button on:click={runInference} class="bg-blue-100">submit</button>
</main>
