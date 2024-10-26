<template xlang="wxml" minapp="mpvue">
	<view class="qrCode">

		<!-- #ifndef MP-ALIPAY -->
		<canvas class="canvas" :canvas-id="cid" :style="{width:cpSize+'px',height:cpSize+'px'}" />
		<!-- #endif -->

		<!-- #ifdef MP-ALIPAY -->
		<canvas :id="cid" :width="cpSize" :height="cpSize" class="canvas" />
		<!-- #endif -->

		<image v-show="show"
			:show-menu-by-longpress="true"
			:src="result"
			:style="{width:cpSize+'px',height:cpSize+'px'}" />
	</view>
</template>
<!-- 

https://ext.dcloud.net.cn/plugin?id=39 
 
 -->
<script>
	import QRCode from "./import/qrcode.js"

	export default {
		name: "x-qr",
		props: {
			cid: {
				type: String,
				default: 'tki-qrcode-canvas'
			},
			size: {
				type: Number,
				default: 200
			},
			unit: {
				type: String,
				default: 'px'
			},
			show: {
				type: Boolean,
				default: true
			},
			value: {
				type: String,
				default: ''
			},
			background: {
				type: String,
				default: '#ffffff'
			},
			foreground: {
				type: String,
				default: '#000000'
			},
			pdground: {
				type: String,
				default: '#000000'
			},
			icon: {
				type: String,
				default: ''
			},
			iconSize: {
				type: Number,
				default: 40
			},
			lv: {
				type: Number,
				default: 3
			},
			onval: {
				type: Boolean,
				default: true
			},
			loadMake: {
				type: Boolean,
				default: false
			},
			usingComponents: {
				type: Boolean,
				default: true
			},
			showLoading: {
				type: Boolean,
				default: false
			},
			loadingText: {
				type: String,
				default: '二维码生成中'
			},
		},
		data() {
			return {
				result: '',
				qrcode: null
			}
		},
		methods: {
			_makeCode() {
				let option = {
					context: this, // 上下文环境
					canvasId: this.cid, // canvas-id
					usingComponents: this.usingComponents, // 是否是自定义组件
					showLoading: this.showLoading, // 是否显示loading
					loadingText: this.loadingText, // loading文字
					text: this.value, // 生成内容
					size: this.cpSize, // 二维码大小
					background: this.background, // 背景色
					foreground: this.foreground, // 前景色
					pdground: this.pdground, // 定位角点颜色
					correctLevel: this.lv, // 容错级别
					image: this.icon, // 二维码图标
					imageSize: this.iconSize, // 二维码图标大小
					cbResult: (res) => { // 生成二维码的回调
						this._result(res)
					}
				};
				// console.log('option', option);
				this.qrcode = new QRCode(option);
			},
			_clearCode() {
				this.qrcode.clear(() => {
					this._result('')
				})
			},
			_saveCode() {
				if (this.result === "") return;

				uni.saveImageToPhotosAlbum({
					filePath: this.result,
					success: function() {
						uni.showToast({
							title: '二维码保存成功',
							icon: 'success',
							duration: 2000
						});
					}
				});

			},
			_result(res) {
				this.result = res;
				this.$emit('result', res)
			},
			_empty(v) {
				let tp = typeof v,
					rt = false;
				if (tp == "number" && String(v) == "") {
					rt = true
				}
				else if (tp == "undefined") {
					rt = true
				}
				else if (tp == "object") {
					if (JSON.stringify(v) == "{}" || JSON.stringify(v) == "[]" || v == null) rt = true
				}
				else if (tp == "string") {
					if (v == "" || v == "undefined" || v == "null" || v == "{}" || v == "[]") rt = true
				}
				else if (tp == "function") {
					rt = false
				}
				return rt
			}
		},
		watch: {
			size: function(n, o) {
				if (n != o && !this._empty(n)) {
					this.cSize = n
					if (!this._empty(this.value)) {
						setTimeout(() => {
							this._makeCode()
						}, 100);
					}
				}
			},
			value: function(n, o) {
				if (this.onval) {
					if (n != o && !this._empty(n)) {
						this._clearCode();
						this._makeCode()
					}
				}
			}
		},
		computed: {
			cpSize() {
				if (this.unit == "upx") {
					return uni.upx2px(this.size)
				}
				else {
					return this.size
				}
			}
		},
		mounted: function() {
			console.log('this.value', this.value);
			if (this._empty(this.value)) return;

			setTimeout(() => {
				this._makeCode()
			}, 10);
		},
	}
</script>
<style lang="scss" scoped>
	.qrCode {
		position: relative;

		.canvas {
			position: fixed;
			top: -99999upx;
			left: -99999upx;
			z-index: -99999;
		}
	}
</style>