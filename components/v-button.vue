<template>
	<view class="fixBtn row middle" :style="css">
		<x-icon class="flex1 center" icon="&#xe708;" size="10" color="#333" />
		<x-icon class="flex1 center" icon="&#xe66a;" size="20" color="#333" />
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
		background-color: #ffffff77;
		border-radius: 50px;
		top: 24px;
		width: 87px;
		height: 32px;
		padding: 0 0 0 5px;
	}
</style>