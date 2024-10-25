export default class {
	fixed = 'tmp';

	constructor(fixed) {
		this.fixed = fixed;
	}

	set(key, value) {
		return uni.setStorageSync(this.fixed + key, value);
	}

	get(key) {
		return uni.getStorageSync(this.fixed + key);
	}

	info() {
		return uni.getStorageInfoSync();
	}

	delete(key) {
		return uni.removeStorageSync(this.fixed + key);
	}

	clean() {
		return uni.clearStorageSync();
	}

	clear(key) {
		const res = uni.getStorageInfoSync();
		res.keys.forEach(k => {
			if (k[0] === '_') return;

			if (typeof key === 'object') {
				key.forEach(ky => {
					if (k.indexOf(ky) !== 0) {
						uni.removeStorageSync(k);
					}
				})
			}
			else {
				if (k.indexOf(key) !== 0) {
					uni.removeStorageSync(k);
				}
			}
		})

		uni.showToast({
			title: '清除成功'
		});
	}
}