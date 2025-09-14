<script>
export let blur = 8;            // end blur in px
export let dir = "to right";    // direction of blur
export let startEdge = "0%";    // start position (no blur)
export let endEdge = "100%";    // end position (full blur)
</script>

<style>
.blur-overlay {
	position: relative;
	inset: 0;
}

.blur-overlay::after {
	content: "";
	position: relative;
	inset: 0;
	backdrop-filter: blur(var(--blur));
	-webkit-backdrop-filter: blur(var(--blur));
	mask-image: linear-gradient(var(--dir),
		rgba(0,0,0,0) var(--start-edge),
		#000           var(--end-edge));
	-webkit-mask-image: linear-gradient(var(--dir),
		rgba(0,0,0,0) var(--start-edge),
		#000           var(--end-edge));
}
</style>

<div
	class="blur-overlay"
	style="
	--blur:{blur}px;
	--dir:{dir};
	--start-edge:{startEdge};
	--end-edge:{endEdge};
	"
></div>

