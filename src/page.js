/**
 * 路由路径规则：
 * 1，原始URL，以/开头，不查询路由表；
 * 2，app目录下的URL，以&开头，如：&home/setup，表示为/app/home/setup
 * 3，以/结尾的，实际URL为在后面加index，如 &home/setup，表示为/app/home/setup/index
 * 4，支持以./和../表示的相对路径
 * 5，在maps路由表中定义的项目
 * 6，以上都不符合时，原样返回
 */
const maps = {
	_pages: '/pages/',
	_tabbar: '/pages/index/',
};

const inType = {
	r: 'slide-in-right', //新窗体从右侧进入
	l: 'slide-in-left', //新窗体从左侧进入
	t: 'slide-in-top', //新窗体从顶部进入
	b: 'slide-in-bottom', //新窗体从底部进入
	p: 'pop-in', //新窗体从左侧进入，且老窗体被挤压而出
	f: 'fade-in', //新窗体从透明到不透明逐渐显示
	z: 'zoom-out', //新窗体从小到大缩放显示
	o: 'zoom-fade-out', //新窗体从小到大逐渐放大并且从透明到不透明逐渐显示
	n: 'none'
};

const outType = {
	right: 'slide-out-right', //新窗体从右侧进入
	left: 'slide-out-left', //新窗体从左侧进入
	top: 'slide-out-top', //新窗体从顶部进入
	bottom: 'slide-out-bottom', //新窗体从底部进入
	pop: 'pop-out', //新窗体从左侧进入，且老窗体被挤压而出
	fade: 'fade-out', //新窗体从透明到不透明逐渐显示
	zoom: 'zoom-in', //新窗体从小到大缩放显示
	zfade: 'zoom-fade-in', //新窗体从小到大逐渐放大并且从透明到不透明逐渐显示
	none: 'none'
};

/**
 * 获取同级，或上一级
 */
const getLevelPath = (level = 1) => {
	let pages = getCurrentPages();
	let path = (pages[pages.length - 1]).route.split('/');
	path.unshift('') //开头加一个空值，
	path.pop(); //弹出最后一个值
	if (level === 2) path.pop(); //若是上一级，再去掉一层
	return path;
}

/**
 * listener和emits，可以作为调用时的第三第四个参数的方式送入，
 * 但建议放在调用者的.then里，如：
 
   this.$open('goods',{goodsID:123}).then(
		res => {
			res.eventChannel.on('open', function (res) {
				console.log('收到了目标页发来的数据2', res);
			});
			//发送数据
			res.eventChannel.emit('channel', '新的channel');
		},
		err => {}
	);
	
	在目标页任意地方：
	this.getOpener('channel', res => {
		console.log('收到了上一页的数据', res)
	})
	
	this.setOpener('open', '打开商品页成功了2')
	this.setOpener('click', '打开商品页成功了1')
	
	此模式，在提交订单中有典型应用用：
	sku/db-cart中，打开order/create.vue时，发送数据；
	order/create.vue，onShow中时接收数据并写入临时变量；
	order/create.vue，打开address时埋点，address中选择地址后回传
	
	也可以直接采用uni.$emit(……) 配合 uni.on(……) 实现上面效果
	
 */

export default class {

	constructor(mp) {
		Object.assign(maps, mp);
	}

	/**
	 * 查询当前webview是否可见
	 */
	isVisible() {
		let pages = getCurrentPages();
		let view = pages[pages.length - 1].$getAppWebview();
		// console.log(view.id); //获得当前webview的id
		// console.log(view.isVisible()); //查询当前webview是否可见
		return view.isVisible();
	}

	open(url, params, listener, emits) {
		//uni.navigateTo(OBJECT) 保留当前页面，跳转到应用内的某个页面，使用uni.navigateBack可以返回到原页面。
		return new Promise((successCall, failCall) => {
			let { path, animation, tabbar } = this.realUrl(url, params, true);
			let action = 'navigateTo';
			if (tabbar) action = 'switchTab';
			// console.log(`uni.${action}`, { path, animation, tabbar, action });

			uni[action]({
				url: path,

				//#ifdef APP-PLUS
				animationType: animation.type,
				animationDuration: animation.time || 300,
				//#endif

				// events: listener,
				success(res) {
					// console.log('uni.navigateTo success', res);
					if (emits instanceof Object) {
						for (let channel in emits) {
							res.eventChannel.emit(channel, emits[channel]);
						}
					}
					if (typeof successCall === 'function') successCall(res.eventChannel);
				},
				fail(err) {
					// console.log('uni.navigateTo fail', err);
					if (typeof failCall === 'function') failCall(err);
				}
			})

		});

	}


	tabbar(url, params) {
		//uni.switchTab(OBJECT) 跳转到 tabBar 页面，并关闭其他所有非 tabBar 页面。路径后不能带参数
		return new Promise((successCall, failCall) => {
			let { path } = this.realUrl(url, params);
			uni.switchTab({
				url: path,
				success(res) {
					successCall(res);
				},
				fail(err) {
					failCall(err);
				}
			})
		});
	}

	back(data) {
		//uni.navigateBack(OBJECT)关闭当前页面，返回上一页面或多级页面。可通过 getCurrentPages() 获取当前的页面栈，决定需要返回几层。

		if (typeof data === 'function') {
			uni.navigateBack({
				delta: 1,
				success: (res) => {
					console.log('navigateBack success', res);
				},
				fail: (err) => {
					console.log('navigateBack fail', err);
					this.tabbar('index');
				}
			});
			setTimeout(data, 100);
			return;
		}


		let title, icon, time, animation;

		if (data instanceof Array) {
			[title, icon, time, animation] = data;
		}
		else if (typeof data === 'string') {
			title = data;
		}
		else if (data instanceof Object) {
			title = data.title;
			icon = data.icon;
			time = data.time;
			animation = data.animation;
		}
		if (typeof animation !== 'object') animation = {};
		Object.assign(animation, {
			type: 'pop',
			time: 300
		});

		if (!icon) icon = 'success';
		if (!time) time = 1500;
		
		uni.navigateBack({
			delta: 1,
			animationType: outType[animation.type || 'pop'],
			animationDuration: animation.time || 300,
			success: (res) => {
				console.log('navigateBack success', res);
			},
			fail: (err) => {
				console.log('navigateBack fail', err);
				this.tabbar('index');
			}
		});
		if (!title) return;
		if (title === 'hideLoading') {
			uni.hideLoading();
			return;
		}

		const opt = { icon, title, duration: time };
		setTimeout((opt) => {
			// console.log('showToast:', opt);
			uni.showToast(opt);
		}, 100, opt);
	}


	load(url, params) {
		//uni.reLaunch(OBJECT) 关闭所有页面，打开到应用内的某个页面。
		//如果跳转的页面路径是 tabBar 页面则不能带参数
		return new Promise((successCall, failCall) => {
			let { path } = this.realUrl(url, params);
			uni.reLaunch({
				url: path,
				success(res) {
					successCall(res);
				},
				fail(err) {
					failCall(err);
				}
			})
		});
	}



	jump(url, params) {
		//uni.redirectTo(OBJECT) 关闭当前页面，跳转到应用内的某个页面。
		//非 tabBar 的页面的路径
		return new Promise((successCall, failCall) => {
			let { path } = this.realUrl(url, params);
			uni.redirectTo({
				url: path,
				success(res) {
					successCall(res);
				},
				fail(err) {
					failCall(err);
				}
			})
		});
	}

	isTabr(uri) {
		if (uri[0] !== '/') uri = `/${uri}`;
		return uri.indexOf(maps._tabbar) === 0;
	}

	realUrl(uri, params, getAnimation) {
		if (uri.slice(-1) === '/') uri += 'index';
		
		if (undefined === params) params = {};
		let animation = {
			type: 'pop-in',
			time: 300
		};
		if (maps[uri]) uri = maps[uri]; //URI映射
		let lab = uri[0];

		if (lab === '.') { //当前位置的同级目录或上一级目录
			const level = uri.indexOf('/');
			let path = getLevelPath(level);
			path.push(uri.slice(level + 1)) //目标path纳入最后
			uri = path.join('/');
			lab = '';
		}

		if (inType[lab]) { //动画类型
			animation.type = inType[lab] || 'pop-in';
			uri = uri.slice(1);
			//由于这前面带有/号，所以要在无/号的情况下判断一下是不是maps的一项
			if (maps[uri.slice(1)]) uri = maps[uri.slice(1)];
		}
		if (maps[uri]) uri = maps[uri]; //重新判断一下URI映射

		const tabbar = (uri.indexOf(maps._tabbar) === 0); //是不是tabbar页面

		if (tabbar) {
			//要跳入的是tabBar，需要将参数用中转器保存一下
			//在各个页面自行用uni.$once侦听,params必须要含params.page参数
			// console.log('发送tabBar中转数据', params)
			// tabBarParams = params
			return { path: uri, tabbar };
		}

		if (lab !== '/') { //当前目录的同级文件
			let path = getLevelPath(1);
			path.push(uri) //目标path纳入最后
			path = path.join('/').build_query(params);
			return { path, animation, tabbar };
		}

		return { path: uri.build_query(params), animation, tabbar };
	}


};