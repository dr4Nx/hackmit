<script>
    import { goto } from "$app/navigation";
    import { MoveRight } from "@lucide/svelte";
    import { steps, metadata } from "../stores";

    // steps.set(`{ "recipe": [ "Start with leftover day-old rice if possible", "Heat a large pan or wok with a little oil", "Scramble an egg or two and set them aside", "Add more oil to the same pan", "Sauté aromatics like garlic, onion, and ginger until fragrant", "Toss in diced vegetables such as carrots, peas, or bell peppers", "Cook vegetables until just tender", "Add the rice, breaking up any clumps with a spatula", "Stir-fry rice so the grains get slightly crisp", "Return the eggs to the pan", "Add any cooked protein like chicken, shrimp, or tofu", "Season with soy sauce, sesame oil, and optionally oyster sauce or chili paste", "Stir everything together until evenly coated and heated through", "Finish with chopped scallions on top", "Serve hot" ] }`);

    // metadata.set(`{ "dish_name": "Frygpqied Rice", "preparation_duration_minutes": 20, "preparation_difficulty": "Easy", "serving_number_of_people": 4, "brief_description": "A versatile Asian stir-fried dish made with day-old rice, eggs, vegetables, and protein of choice, seasoned with soy sauce and aromatics for a quick and flavorful meal.", "ingredients": [ "3 cups cooked day-old rice", "2 eggs", "2 tablespoons cooking oil", "2 cloves garlic, minced", "1 small onion, diced", "1 teaspoon fresh ginger, minced", "1 cup mixed vegetables (carrots, peas, bell peppers)", "1 cup cooked protein (chicken, shrimp, or tofu)", "3 tablespoons soy sauce", "1 teaspoon sesame oil", "1 tablespoon oyster sauce (optional)", "1 teaspoon chili paste (optional)", "2 scallions, chopped" ], "nutritional_value": [ "Calories: 320 per serving", "Carbohydrates: 42g", "Protein: 15g", "Fat: 10g", "Fiber: 3g", "Sodium: 820mg" ] }`);

    let foodData;
    try {
        foodData = JSON.parse(
            $metadata ||
                '{"dish_name": "", "preparation_duration_minutes": 0, "preparation_difficulty": "", "serving_number_of_people": 0, "brief_description": "", "ingredients": [], "nutritional_value": []}'
        );
    } catch (e) {
        console.error("Error parsing metadata:", e);
        foodData = {
            dish_name: "",
            preparation_duration_minutes: 0,
            preparation_difficulty: "",
            serving_number_of_people: 0,
            brief_description: "",
            ingredients: [],
            nutritional_value: [],
        };
    }

    let stepList;
    try {
        stepList = JSON.parse($steps || '{"recipe": []}').recipe;
    } catch (e) {
        console.error("Error parsing steps:", e);
        stepList = { recipe: [] };
    }

    const startCooking = () => {
        goto("/cooking");
    };
</script>

<main class="main">
    <div class="left">
        <div class="top-container">
            <button
                style="background: none; outline: none; border: none; cursor: pointer; width: fit-content; height: fit-content;"
                on:click={() => goto("/")}
            >
                <img width="82" src="remy+text.svg" alt="" />
            </button>

            <h1 style:margin-top="18px" style:margin-bottom="4px" class="title">
                {foodData.dish_name || "Default Name"}
            </h1>

            <div class="mini-container">
                <div class="attr">
                    <img src="clock.svg" alt="clock" />
                    <p>{foodData.preparation_duration_minutes} minutes</p>
                </div>

                <hr style:height="20px" />

                <div class="attr">
                    <img src="book.svg" alt="book" />
                    <p>{foodData.preparation_difficulty}</p>
                </div>

                <hr style:height="20px" />

                <div class="attr">
                    <img src="pax.svg" alt="pax" />
                    <p>Serves {foodData.serving_number_of_people}</p>
                </div>
            </div>
        </div>

        <p>{foodData.brief_description}</p>

        <div class="container">
            <h1 class="subtitle">Ingredients</h1>
            {#each foodData.ingredients.slice(0, 11) as item}
                <p>{item}</p>
            {/each}
        </div>

        <div class="container">
            <h1 class="subtitle">Nutritional Value</h1>

            {#each foodData.nutritional_value as item, i}
                <p>{item}</p>
            {/each}
        </div>
    </div>

    <div class="right">
        <div>
            <div class="container" style:margin-bottom="48px">
                <h1 class="subtitle">Instructions</h1>
                <div class="attr">
                    <img src="list.svg" alt="list" />
                    <p>{stepList.length} Steps Total</p>
                </div>
            </div>

			<div style:display=flex style:flex-direction=column style:row-gap=32px>
				{#each stepList as step, i}
					<div class="step-container">
						<p style:font-weight=500>Step {i}</p>
						<p>{step}</p>
					</div>
				{/each}
			</div>
		</div>

        <div class="container" style="align-items: end;">
            <button
                class="submit-btn"
                type="button"
                on:mousedown|preventDefault
                on:click={startCooking}
            >
                <div
                    style:display="flex"
                    style:align-items="center"
                    style:gap="8px"
                >
                    Get Started
                    <MoveRight
                        strokeWidth="2px"
                        size="18px"
                        color="var(--clight)"
                    />
                </div>
            </button>
        </div>
    </div>
</main>

<style>
    p {
        letter-spacing: -1%;
        font-weight: 300;
        font-size: 18px;
    }

    .main {
        font-family: "Metric";
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        width: 100vw;
        height: 100vh;
        padding: 96px 64px 96px 96px;
        column-gap: 64px;
        overflow: scroll;
    }

    .step-container {
        display: flex;
        justify-content: center;
        align-items: start;
        flex-direction: column;
        width: 100%;
        row-gap: 4px;
    }

    .top-container {
        display: flex;
        justify-content: center;
        align-items: start;
        flex-direction: column;
        gap: 0;
        width: 100%;
    }

    .mini-container {
        display: flex;
        justify-content: start;
        align-items: center;
        column-gap: 16px;
    }

    .attr {
        display: flex;
        justify-content: center;
        align-items: center;
        column-gap: 4px;
    }

    .container {
        display: flex;
        flex-direction: column;
        align-items: start;
        justify-content: start;
        width: 100%;
        row-gap: 8px;
    }

    .title {
        font-family: "Signifier";
        font-size: 48px;
        margin: 0;
        padding: 0;
        letter-spacing: -4%;
        font-weight: 500;
    }

    .subtitle {
        font-family: "Signifier";
        font-size: 32px;
        margin: 0;
        padding: 0;
        font-weight: 400;
    }

    .right,
    .left {
        display: flex;
        flex-direction: column;
        align-items: center;
        height: 100%;
        flex: 1;
    }

    .left {
        align-items: start;
        row-gap: 48px;
        justify-content: start;
    }

    .right {
        align-items: start;
        row-gap: 48px;
		margin-top: -32px;
		margin-bottom: -32px;
        height: calc(100% + 2 * 32px);
        background-color: var(--clight75);
        box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.04);
        overflow: scroll;
        /* height: fit-content; */
        padding: 32px;
        border-radius: 8px;
        justify-content: space-between;
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
