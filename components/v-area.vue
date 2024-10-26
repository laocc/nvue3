<template>
	<view v-if="loadError">
		<text class="cf00 fs16 flex1 middle" @click="loadArea">地址数据加载失败，点此重试</text>
	</view>
	<picker v-else
		mode="multiSelector"
		class="flex1 middle row"

		@columnchange="column"
		@cancel="cancel"
		@change="change"

		:value="index"
		:range="range">

		<text class="fs16 flex1 middle">{{choose.names.slice(0-show).join(symbol)}}</text>

	</picker>
</template>

<script setup>
	import { reactive, inject, onMounted, ref } from 'vue';
	const { post } = inject('$http');

	const { sync, api, cache } = defineProps({
		api: { //初始数据下载API
			type: String,
			default: 'l/app/area/'
		},
		symbol: { //显示连接符号
			type: String,
			default: ' '
		},
		show: { //显示到哪个级别：1=县 2=市 3=省
			type: [Number, String],
			default: 3
		},
		sync: { //实时同步，同时步，cancel也会变更值
			type: Boolean,
			default: false
		},
		cache: { //缓存保存Key
			type: String,
			default: 'chinaArea'
		}
	});

	// const area = new areaClass();

	const range = reactive(JSON.parse('[[],[],[]]'));
	const index = reactive([0, 0, 0]);
	const areaData = reactive([0, 0, 0]);
	const loadError = ref(false);
	const code = defineModel({ type: String });
	const choose = defineModel('choose', { type: Object, default: { code: '', prov: '', city: '', county: '', names: [] } })

	/**
	 * value 改变时触发 change 事件，event.detail = {value: value}	
	 * value是一个数组，对应的就是index的值
	 */
	const cancel = (e) => {
		console.log('areaCancel', e)
	}


	const loadArea = () => {
		const areaDB = uni.getStorageSync(cache);
		if (areaDB) {
			const index = parseInt(import.meta.env.VITE_AREA_VERSION);
			console.log({ index, areaDB });
			if ((index > 0) && (areaDB.index >= index)) {
				areaData[0] = areaDB.area;
				renderCode();
				return;
			}
		}

		post(api).then(
			(res) => {
				uni.setStorageSync(cache, res.data);
				areaData[0] = res.data.area;
				renderCode();
			},
			(err) => {
				loadError.value = true;
				uni.showToast({
					title: err.message,
					icon: 'none'
				})
			}
		)

	}


	const renderCode = () => {
		let sCode = String(code.value);

		let a = sCode.slice(0, 2),
			b = sCode.slice(2, 4),
			c = sCode.slice(4, 6);
		let prov = `${a}0000`,
			city = (b === '00') ? '' : `${a}${b}00`,
			cont = (c === '00') ? '' : sCode;
		// console.log('render Code', { code, sCode, a, b, c, prov, city, cont });
		for (let i of [0, 1, 2]) range[i].length = 0;

		for (let [p, aProv] of areaData[0].entries()) {
			range[0].push(aProv.name);
			if (prov === '' || prov === '000000') prov = aProv['code'];
			if (aProv['code'] !== prov) continue;

			index.splice(0, 1, p)
			areaData[1] = aProv['list'];

			for (let [c, aCity] of aProv.list.entries()) {
				range[1].push(aCity.name);
				if (city === '') city = aCity['code'];
				if (aCity['code'] !== city) continue;

				index.splice(1, 1, c)
				areaData[2] = aCity['list'];

				for (let [t, aCounty] of aCity.list.entries()) {
					range[2].push(aCounty.name);
					if (cont === '') cont = aCounty['code'];
					if (aCounty['code'] !== cont) continue;
					index.splice(2, 1, t);

				}

			}

		}

		updateData().then(
			res => {
				// console.log({ res });
				// console.log(code.value, res.code, choose);
			}
		);
	}

	/**
	 * 某一列的值改变时触发 columnchange 事件，
	 * event.detail = {column: column, value: value}，
	 * column 的值表示改变了第几列（下标从0开始），
	 * value 的值表示变更值的下标
	 */
	const column = (event) => {
		const { column, value } = event.detail
		index.splice(column, 1, value);

		if (column === 0) {
			areaData[1] = areaData[0][value]['list'];
			areaData[2] = areaData[1][0]['list'];

			index.splice(1, 1, 0); //city改为第1个
			index.splice(2, 1, 0); //county改为第1个
		}
		else if (column === 1) {
			areaData[2] = areaData[1][value]['list'];
			index.splice(2, 1, 0); //county改为第1个
		}

		for (let i of [0, 1, 2]) {
			range[i].length = 0;
			for (let p of areaData[i]) range[i].push(p.name);
		}

		if (!sync) return;

		updateData().then(
			res => {
				code.value = res.code;
				//由于code是v-model绑定值，这里变更后，页面和上层会实时更新，但这里打印的还是上一次值
				// console.log(code.value, res.code, choose);
			}
		);

	}


	const change = () => {
		updateData().then(
			res => {
				code.value = res.code;
				// console.log(code.value, res.code, choose);
			}
		);
	}

	const updateData = () => {
		return new Promise((successCall) => {
			choose.value.names.length = 0;
			index.forEach((v, i) => {
				let item = areaData[i][v];
				if (!item) return;

				if (i == 0) choose.value.prov = item.name;
				else if (i == 1) choose.value.city = item.name;
				else if (i == 2) {
					choose.value.county = item.name;
					choose.value.code = item.code;
				}
				choose.value.names.push(item['name']);
			})
			successCall(choose.value)
		});
	}

	onMounted(() => {
		loadArea();
	})
</script>
