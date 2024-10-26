<template>


	<view class="pageError center middle" v-if="pageState===2">
		<text class="fs18 c555 center flex5">{{pageMessage}}</text>
		<text class="btn btn1 center" @click="back">返回</text>
		<text class="flex1"></text>
	</view>


	<view class="pageLoading" v-else-if="pageState===0">

		<view class="body center flex1">
			<x-icon class="icon margin20_" :color="color" :size="size" :loading="icon" />
			<text class="error fsDef c555">{{pageMessage}}</text>

			<text class="reload fsDef" v-if="reload" @click="doReload">重试加载</text>
		</view>

		<view class="bottom center">
			<text class="padding20_ fsDef caaa">{{$soft.name}}</text>
		</view>
	</view>



	<view class="paging row center middle" v-else>
		<text class="line flex1"></text>
		<text class="text fs12 caaa" @click="loadMore">{{statusText}}</text>
		<text class="line flex1"></text>
	</view>



</template>

<script setup>
	import { computed, ref, inject, onMounted } from 'vue';
	import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app';
	const { back } = inject('$pages');
	const { post } = inject('$http');
	const datas = defineModel({ type: Array, default: [] });
	const emit = defineEmits(['update']);
	const pageIndex = ref(0); //分页码，必须是0，后面加载时会+1
	const pageState = ref(0); //页面状态：0请求中，1请求完成，2出错
	const pageMessage = ref('加载中');
	const status = ref('click'); //分页状态值

	const { api, params, listen, field } = defineProps({
		params: {
			type: Object,
			default: {}
		},
		reload: {
			type: Boolean,
			default: false
		},
		api: {
			type: String,
			default: ''
		},
		listen: { //页面侦听是否数据增加，比如在编辑页面新增了数据，在这侦听到就会立即刷新
			type: String,
			default: ''
		},
		field: {
			type: String,
			default: ''
		},
		size: {
			type: Number,
			default: 32
		},
		color: {
			type: String,
			default: '#00815e'
		},
		icon: {
			type: String,
			default: '&#xe627;' //&#xe600;&#xe891;&#xe62e;
		}
	});

	const statusText = computed(() => {
		switch (status.value) {
			case 'click':
				return '点击加载';
			case 'loadmore':
				return '点击加载更多';
			case 'loading':
				return '努力加载中';
			case 'nomore':
				return '没有更多了';
			case 'empty':
				return '没有记录';
			default:
				return '点击加载更多';
		}
	})

	const loadMore = () => {
		switch (status.value) {
			case 'click':
			case 'loadmore':
			case 'loading':
				return request(false);
			case 'nomore':
			case 'empty':
				return '没有记录';
			default:
				return request(true);
		}
	}

	const paging = { index: 1, total: 0 };
	/**
	 * refresh：是否加载第1页，否则就是页面+1
	 * 
	 */
	const request = (refresh, option = {}) => {
		const index = refresh ? 1 : (pageIndex.value + 1)

		post(api, Object.assign({}, params, option, { index })).then(
			res => {
				uni.stopPullDownRefresh();
				Object.assign(paging, res.paging);

				const resData = field ? res.data[field] : res.data;
				if (refresh) {
					datas.value = [...resData];
				}
				else if (resData.length > 0) {
					datas.value.push(...resData);
				}
				emit('update', res.data, refresh);

				pageState.value = 1;
				pageIndex.value = paging.index;
				if (paging.total < 2) pageIndex.value = 1;
				if (paging.index < paging.total) {
					status.value = 'loadmore';
				}
				else if (!paging.total) {
					status.value = 'empty';
				}
				else {
					status.value = 'nomore';
				}
			},
			err => {
				uni.stopPullDownRefresh();
				pageMessage.value = err.message;
				pageState.value = 2;
			}
		)
	}

	onMounted(() => {
		/**
		 * loaded只在onMounted时存在，表示是首次加载，后端据此返回一些页面参数
		 */
		request(true, { loaded: 1 });

		if (!listen) return;
		uni.$on(listen, () => { request(true, {}) });

	})

	onPullDownRefresh(() => { //下拉刷新
		request(true, {});
	})
	onReachBottom(() => { //拉到底部，加载更多
		request(false, {});
	})

	const doReload = () => {
		request(true)
	}

	defineExpose({ request })
</script>

<style lang="scss" scoped>
	/**
	* 360度转动，对象本身要宽义width/height
	*/
	@mixin rotate($tm: 1s) {
		display: flex;
		align-items: center;
		justify-content: center;
		-webkit-animation: rotate360 $tm linear infinite;
		animation: rotate360 $tm linear infinite;
	}

	@keyframes rotate360 {
		100% {
			transform: rotateZ(360deg);
		}
	}

	.pageError {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 1001;
		background-color: #eee;
		background-image: linear-gradient(135deg, rgb(250, 244, 231), rgb(238, 227, 188));
		// padding: 10px 20px;

		.btn {
			padding: 10px 50px;
			border-radius: 5px;
		}

	}

	.pageLoading {
		@include fullPage;
		@include fixed_center;

		.reload {
			padding: 8px 15px;
			background-color: $major;
			color: #fff;
			border-radius: 5px;
			margin: 20px;
		}

		.icon {
			@include rotate(2s);
		}
	}


	.paging {
		margin: 5px;
		padding-top: 15px;
		padding-bottom: 50px;

		// background-color: #abc;
		.text {
			cursor: pointer;

			&:hover {
				color: $major;
			}
		}

		.line {
			height: 1px;
			background-color: #ddd;
			margin: 0 20px;
		}
	}
</style>