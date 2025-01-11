<template>
	<view class="fixBtn" :style="css">
		<slot />
	</view>
</template>

<script setup>
	import { computed } from 'vue';
	const { windowWidth } = uni.getWindowInfo();

	const css = computed(() => {
		const css = {};
		css.left = (windowWidth - 87 - 14) + 'px';
		css.right = (windowWidth - 7) + 'px';
		return css;
	})
</script>

<style lang="scss" scoped>
	.fixBtn {
		position: fixed;
		z-index: 12345;
		background-color: #ffffff33;
		border-radius: 50px;
		top: 24px;
		width: 87px;
		height: 32px;
	}
</style>