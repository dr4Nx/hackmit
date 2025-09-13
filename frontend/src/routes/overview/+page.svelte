<script lang="ts">
	// Sample recipe data - this would come from props or API
	let recipe = {
		title: "Sunny-side Up Eggs",
		description: "Sunny-side-up eggs deliver set, tender whites with a warm, runny yolk. Use steady medium-low heat for clean edges and zero flipping.\n\nBreakfast basic, done right.",
		time: "12 minutes",
		difficulty: "Easy",
		serves: "Serves 1",
		stepsTotal: "5 Steps Total",
		ingredients: [
			{ amount: "1 teaspoon", item: "olive oil" },
			{ amount: "2", item: "large eggs" },
			{ amount: "", item: "kosher salt & freshly ground black pepper" },
			{ amount: "1", item: "multigrain toast (optional)" }
		],
		nutrition: [
			{ label: "Calories", value: "185 kcal" },
			{ label: "Protein", value: "12.6g" },
			{ label: "Fat", value: "14.1g" },
			{ label: "Carbs", value: "0.8g" }
		],
		steps: [
			{
				number: 1,
				instruction: "Heat the oil in a medium nonstick skillet over low heat until slightly shimmering, about 5 minutes."
			},
			{
				number: 2,
				instruction: "Crack an egg into a small ramekin and slowly add it to the skillet; repeat with the other egg, adding it to the other side of the skillet."
			},
			{
				number: 3,
				instruction: "Cover with a tight lid and cook, uninterrupted, until the whites are completely set but the yolks are still runny, 2 to 2 1/2 minutes."
			},
			{
				number: 4,
				instruction: "Slide the eggs out of the skillet onto a plate or toast."
			},
			{
				number: 5,
				instruction: "Season with salt and pepper."
			}
		]
	};

	const handleGetStarted = () => {
		// Navigation logic here
		console.log("Get Started clicked");
	};
</script>

<main class="main">
	<!-- Background Image with Overlay -->
	<div class="background">
		<img 
			class="background-image" 
			src="https://placehold.co/1512x982" 
			alt="Recipe background"
		/>
		<div class="background-overlay"></div>
	</div>

	<!-- Content Container -->
	<div class="content-container">
		<!-- Left Column - Recipe Info -->
		<div class="left-column">
			<!-- Logo -->
			<div class="logo">
				<div class="logo-icon"></div>
				<div class="logo-text">
					<div class="logo-title">remy</div>
					<div class="logo-line"></div>
				</div>
			</div>

			<!-- Recipe Title -->
			<h1 class="recipe-title">
				{recipe.title}
			</h1>

			<!-- Recipe Meta Info -->
			<div class="recipe-meta">
				<span class="meta-text">{recipe.time}</span>
				<!-- Clock Icon -->
				<div class="icon clock-icon">
					<div class="clock-face"></div>
					<div class="clock-hand-hour"></div>
					<div class="clock-hand-minute"></div>
				</div>
				
				<div class="meta-divider"></div>
				
				<span class="meta-text">{recipe.difficulty}</span>
				<!-- Difficulty Icon -->
				<div class="icon difficulty-icon">
					<div class="difficulty-bar"></div>
				</div>
				
				<div class="meta-divider"></div>
				
				<span class="meta-text">{recipe.serves}</span>
				<!-- Serves Icon -->
				<div class="icon serves-icon">
					<div class="serves-plate"></div>
					<div class="serves-person"></div>
				</div>
			</div>

			<!-- Description -->
			<div class="recipe-description">
				{recipe.description}
			</div>

			<!-- Ingredients Section -->
			<div class="section">
				<h2 class="section-title">
					Ingredients
				</h2>
				<div class="ingredients-list">
					{#each recipe.ingredients as ingredient}
						<div class="ingredient-item">
							{#if ingredient.amount}
								<span class="ingredient-amount">{ingredient.amount}</span>
								<span class="ingredient-name"> {ingredient.item}</span>
							{:else}
								<span class="ingredient-name">{ingredient.item}</span>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- Nutritional Value Section -->
			<div class="section">
				<h2 class="section-title">
					Nutritional Value
				</h2>
				<div class="nutrition-grid">
					<div class="nutrition-labels">
						{#each recipe.nutrition as item}
							<div class="nutrition-label">
								{item.label}
							</div>
						{/each}
					</div>
					<div class="nutrition-values">
						{#each recipe.nutrition as item}
							<div class="nutrition-value">
								{item.value}
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>

		<!-- Right Column - Instructions Panel -->
		<div class="right-column">
			<div class="instructions-panel">
				<!-- Instructions Header -->
				<div class="instructions-header">
					<h2 class="instructions-title">
						Instructions
					</h2>
					<div class="instructions-meta">
						<!-- List Icon -->
						<div class="icon list-icon">
							<div class="list-line-1"></div>
							<div class="list-line-2"></div>
							<div class="list-line-3"></div>
							<div class="list-checkbox"></div>
						</div>
						<span class="instructions-count">{recipe.stepsTotal}</span>
					</div>
				</div>

				<!-- Steps -->
				<div class="steps-list">
					{#each recipe.steps as step}
						<div class="step-item">
							<div class="step-number">
								Step {step.number}
							</div>
							<div class="step-instruction">
								{step.instruction}
							</div>
						</div>
					{/each}
				</div>

				<!-- Get Started Button -->
				<button
					on:click={handleGetStarted}
					class="get-started-button"
				>
					Get Started
					<div class="button-arrow">
						<div class="arrow-line"></div>
						<div class="arrow-head"></div>
					</div>
				</button>
			</div>
		</div>
	</div>
</main>

<style>
	.main {
		min-height: 100vh;
		background-color: oklch(0.9761 0 0);
		position: relative;
		overflow: hidden;
	}

	.background {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.background-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.background-overlay {
		position: absolute;
		inset: 0;
		background-color: rgba(245, 245, 245, 0.75);
		backdrop-filter: blur(2px);
	}

	.content-container {
		position: relative;
		z-index: 10;
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	.left-column {
		width: 100%;
		padding: 1.5rem;
		overflow-y: auto;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 3rem;
	}

	.logo-icon {
		width: 1.5rem;
		height: 1.25rem;
		border: 1px solid oklch(0.1998 0.002 106.58);
	}

	.logo-title {
		color: oklch(0.1998 0.002 106.58);
		font-size: 1.5rem;
		font-family: "Signifier";
		line-height: 0.75rem;
	}

	.logo-line {
		width: 2rem;
		height: 1px;
		background-color: oklch(0.1998 0.002 106.58);
	}

	.recipe-title {
		color: black;
		font-size: 1.875rem;
		font-weight: 500;
		font-family: "Signifier";
		line-height: 1.25;
		margin-bottom: 2rem;
	}

	.recipe-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.5rem;
		margin-bottom: 2rem;
	}

	.meta-text {
		color: black;
		font-size: 1.125rem;
		font-weight: normal;
	}

	.icon {
		width: 1rem;
		height: 1rem;
		position: relative;
	}

	.clock-face {
		position: absolute;
		inset: 0;
		border: 1px solid oklch(0.1998 0.002 106.58);
		border-radius: 50%;
	}

	.clock-hand-hour {
		position: absolute;
		top: 0.25rem;
		left: 0.5rem;
		width: 0.125rem;
		height: 0.375rem;
		background-color: oklch(0.1998 0.002 106.58);
	}

	.clock-hand-minute {
		position: absolute;
		top: 0.5rem;
		left: 0.5rem;
		width: 0.25rem;
		height: 0.125rem;
		background-color: oklch(0.1998 0.002 106.58);
	}

	.meta-divider {
		width: 1px;
		height: 1rem;
		background-color: oklch(0.1998 0.002 106.58);
	}

	.difficulty-bar {
		position: absolute;
		top: 0.25rem;
		left: 0.25rem;
		width: 0.625rem;
		height: 0.75rem;
		border: 1px solid oklch(0.1998 0.002 106.58);
	}

	.serves-plate {
		position: absolute;
		bottom: 0.25rem;
		left: 0.25rem;
		width: 0.625rem;
		height: 0.375rem;
		border: 1px solid oklch(0.1998 0.002 106.58);
	}

	.serves-person {
		position: absolute;
		top: 0.125rem;
		left: 0.375rem;
		width: 0.375rem;
		height: 0.375rem;
		border: 1px solid oklch(0.1998 0.002 106.58);
		border-radius: 50%;
	}

	.recipe-description {
		color: black;
		font-size: 1rem;
		font-weight: 300;
		line-height: 1.625;
		margin-bottom: 2rem;
		white-space: pre-line;
		max-width: 36rem;
	}

	.section {
		margin-bottom: 2rem;
	}

	.section-title {
		color: black;
		font-size: 1.5rem;
		font-weight: normal;
		font-family: "Signifier";
		line-height: 1.75;
		margin-bottom: 1.5rem;
	}

	.ingredients-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.ingredient-item {
		color: black;
		font-size: 1.125rem;
		line-height: 1.625;
	}

	.ingredient-amount {
		font-weight: normal;
	}

	.ingredient-name {
		font-weight: 300;
	}

	.nutrition-grid {
		display: flex;
		gap: 3rem;
	}

	.nutrition-labels,
	.nutrition-values {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.nutrition-label {
		color: black;
		font-size: 1.125rem;
		font-weight: 300;
		line-height: 1.625;
	}

	.nutrition-value {
		color: black;
		font-size: 1.125rem;
		font-weight: normal;
		line-height: 1.625;
		text-align: right;
	}

	.right-column {
		width: 100%;
		padding: 1.5rem;
		display: flex;
		justify-content: center;
	}

	.instructions-panel {
		width: 100%;
		max-width: 28rem;
		background-color: rgba(255, 255, 255, 0.75);
		border-radius: 0.5rem;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
		padding: 1.5rem;
		height: fit-content;
	}

	.instructions-header {
		margin-bottom: 1.5rem;
	}

	.instructions-title {
		color: black;
		font-size: 1.5rem;
		font-weight: normal;
		font-family: "Signifier";
		line-height: 1.75;
		margin-bottom: 1rem;
	}

	.instructions-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.list-icon {
		width: 1rem;
		height: 1rem;
		position: relative;
	}

	.list-line-1 {
		position: absolute;
		top: 0.25rem;
		left: 0.125rem;
		width: 0.75rem;
		height: 0.125rem;
		background-color: oklch(0.1998 0.002 106.58);
	}

	.list-line-2 {
		position: absolute;
		top: 0.5rem;
		left: 0.125rem;
		width: 0.75rem;
		height: 0.125rem;
		background-color: oklch(0.1998 0.002 106.58);
	}

	.list-line-3 {
		position: absolute;
		top: 0.75rem;
		left: 0.125rem;
		width: 0.75rem;
		height: 0.125rem;
		background-color: oklch(0.1998 0.002 106.58);
	}

	.list-checkbox {
		position: absolute;
		top: 0.125rem;
		left: 0.75rem;
		width: 0.75rem;
		height: 0.875rem;
		border: 1px solid oklch(0.1998 0.002 106.58);
	}

	.instructions-count {
		color: black;
		font-size: 1.125rem;
		font-weight: normal;
	}

	.steps-list {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.step-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.step-number {
		color: black;
		font-size: 1.125rem;
		font-weight: 500;
	}

	.step-instruction {
		color: black;
		font-size: 1.125rem;
		font-weight: 300;
		line-height: 1.375;
	}

	.get-started-button {
		width: 100%;
		margin-top: 3rem;
		background-color: black;
		color: white;
		font-size: 1.125rem;
		font-weight: 500;
		padding: 0.75rem 1.5rem;
		border-radius: 0.375rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		transition: background-color 0.2s ease;
	}

	.get-started-button:hover {
		background-color: #374151;
	}

	.button-arrow {
		display: flex;
		align-items: center;
	}

	.arrow-line {
		width: 1rem;
		height: 0.125rem;
		background-color: white;
	}

	.arrow-head {
		width: 0.125rem;
		height: 0.5rem;
		background-color: white;
		margin-left: 0.25rem;
	}

	/* Responsive Design */
	@media (min-width: 768px) {
		.left-column {
			padding: 3rem;
		}

		.right-column {
			padding: 3rem;
		}

		.instructions-panel {
			padding: 2rem;
		}

		.recipe-title {
			font-size: 2.25rem;
		}

		.recipe-meta {
			gap: 1rem;
		}

		.recipe-description {
			font-size: 1.125rem;
		}

		.section-title {
			font-size: 1.875rem;
		}

		.instructions-title {
			font-size: 1.875rem;
		}

		.instructions-header {
			margin-bottom: 2rem;
		}

		.nutrition-grid {
			gap: 6rem;
		}
	}

	@media (min-width: 1024px) {
		.content-container {
			flex-direction: row;
		}

		.left-column {
			width: 50%;
			padding: 6rem;
		}

		.right-column {
			width: 50%;
			padding: 4rem;
		}

		.recipe-title {
			font-size: 3rem;
			line-height: 3rem;
			margin-bottom: 4rem;
		}

		.recipe-meta {
			margin-bottom: 4rem;
		}

		.recipe-description {
			margin-bottom: 4rem;
		}

		.section {
			margin-bottom: 4rem;
		}
	}
</style>