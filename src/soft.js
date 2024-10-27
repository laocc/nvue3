export default class {
	system = ''; //操作系统及版本
	platform = process.env.VUE_APP_PLATFORM; //mp-weixin,h5,app-plus等
	mode = process.env.NODE_ENV; //运行环境 

	brand = ''; //手机品牌，huawei,xiaomi,vivo,oppo
	model = ''; //手机品牌下的型号
	devid = ''; //手机唯一编码

	singlePage = false; //是否从朋友圈进入的单页模式

	// #ifdef APP-PLUS
	packName = ''; //APP包名
	appid = ''; //小程序的APPID，H5和APP为在manifest中设置的appid
	name = ''; //应用名称，即在manifest中设置的应用名称
	theme = ''; //主体色

	oaid = ''; //获取匿名设备标识符
	aaid = ''; //获取应用匿名设备标识符
	imei = ''; //设备的国际移动设备身份码
	uuid = ''; //设备的唯一标识
	imsi = ''; //设备的国际移动用户识别码
	simulator = 0; //模拟器可能性判断，oaid,aaid,uuid其中任一个读取出错各加1
	// #endif

	version = 'unknow'; //当前应用版本号，小程序=提交申核的版本号

	size = {
		top: 0, //顶部状态栏高度
		width: 0, //屏幕宽
		height: 0, //高，不含状态栏
		ratio: 1, //设备像素比
		button: {},
		navbar: 0,
	};

	constructor(conf) {
		try {

			// #ifdef MP-WEIXIN
			const { scene } = uni.getLaunchOptionsSync();
			this.singlePage = (scene === 1154);
			console.log('weixin.singlePage=', this.singlePage, scene);
			// #endif

			// console.log('soft start')
			// #ifdef MP-WEIXIN || APP || H5
			if (!this.singlePage) {
				const base = uni.getAppBaseInfo();
				this.name = base.appName || 'unknow'; //应用名称
				this.sdk = base.SDKVersion || '0.0.0'; //SDK主版本号
				this.appid = base.appId; //这是uniAPP的ID，不是小程序的ID
				this.version = base.appVersion; //APP的版本号，也就是在manifest中设置的版本号，小程序为提交申核的版本号
				this.theme = base.theme; //主体色
			}
			// #endif

			// #ifdef MP-WEIXIN || APP || H5
			if (!this.singlePage) {
				const device = uni.getDeviceInfo();
				this.brand = (device.brand || 'unknow').toLowerCase(); //手机品牌
				this.model = device.model || 'unknow'; //手机品牌下的型号
				this.devid = device.deviceId || 'unknow'; //设备唯一编码
				this.system = device.system || 'unknow'; //操作系统及版本	

				const windows = uni.getWindowInfo();
				this.size.windowWidth = windows.windowWidth; //可使用窗口宽度	
				this.size.windowHeight = windows.windowHeight; //

				this.size.width = windows.windowWidth; //可使用窗口宽度
				this.size.height = windows.windowHeight;

				this.size.screenWidth = windows.screenWidth; //屏幕尺寸
				this.size.screenHeight = windows.screenHeight;

				this.size.top = windows.statusBarHeight || 25; //顶部状态栏高度，css中直接用var(--status-bar-height)
				this.size.ratio = windows.pixelRatio; //设备像素比

				this.size.navigation = conf.navHeight || 44; //导航栏高度 var(--status-bar-height)
				this.size.bodyHeight = windows.screenHeight - this.size.top - this.size.navigation; //除去顶部和菜单的高度
			}
			else {
				//单页模式下，只有这个能获取到尺寸
				const system = uni.getSystemInfoSync();
				this.size.windowWidth = system.windowWidth; //可使用窗口宽度	
				this.size.windowHeight = system.windowHeight; //
				this.size.top = system.statusBarHeight || 26; //顶部状态栏高度
				this.size.ratio = system.pixelRatio; //设备像素比
				this.size.screenWidth = system.screenWidth; //屏幕尺寸
				this.size.screenHeight = system.screenHeight;
				this.size.width = system.windowWidth; //屏幕尺寸
				this.size.height = system.windowHeight;
				this.size.navigation = conf.navHeight || 44; //导航栏高度
				this.size.bodyHeight = system.screenHeight - this.size.top - this.size.navigation; //除去顶部和菜单的高度
			}
			// #endif


			// #ifndef MP-WEIXIN || APP || H5
			const system = uni.getSystemInfoSync();

			this.brand = (system.brand || 'unknow').toLowerCase(); //手机品牌
			this.name = system.name || 'unknow'; //应用名称
			this.model = system.model || 'unknow'; //手机品牌下的型号
			this.devid = system.deviceId || 'unknow'; //设备唯一编码
			this.sdk = system.SDKVersion || '0.0.0'; //小程序主版本号
			this.appid = system.appId;
			this.os = system.osName;
			this.osver = system.osVersion;
			this.version = system.appVersion; //APP的版本号，也就是在manifest中设置的版本号，小程序为提交申核的版本号

			this.size.windowWidth = system.windowWidth; //可使用窗口宽度	
			this.size.windowHeight = system.windowHeight; //
			this.size.top = system.statusBarHeight || 26; //顶部状态栏高度
			this.size.ratio = system.pixelRatio; //设备像素比
			this.size.screenWidth = system.screenWidth; //屏幕尺寸
			this.size.screenHeight = system.screenHeight;
			this.size.width = system.windowWidth; //屏幕尺寸
			this.size.height = system.windowHeight;
			this.size.navigation = conf.navHeight || 44; //导航栏高度
			this.size.bodyHeight = system.screenHeight - this.size.top - this.size.navigation; //除去顶部和菜单的高度

			// #endif

			//#ifdef H5
			this.ua = navigator.userAgent;
			this.devid = uni.getStorageSync('_DEVID_');
			if (!this.devid) {
				this.devid = ''.rand();
				uni.setStorageSync('_DEVID_', this.devid);
			}
			//#endif


			// #ifdef MP-WEIXIN||MP-ALIPAY||MP-BAIDU||MP-QQ||MP-KUAISHOU
			const accountInfo = uni.getAccountInfoSync();
			this.appid = accountInfo.miniProgram.appId; //小程序的appID，抖音、飞书、百度，不支持
			this.version = accountInfo.miniProgram.version; //APP的版本号
			if (!this.version) this.version = accountInfo.miniProgram.envVersion;
			// #endif

			//#ifdef MP-TOUTIAO
			const accountTou = tt.getEnvInfoSync();
			this.appid = accountTou.microapp.appId;
			this.version = accountTou.microapp.mpVersion;
			if (!this.version) this.version = accountTou.microapp.envType;
			// #endif


			// #ifdef MP-WEIXIN||MP-ALIPAY||MP-BAIDU||MP-TOUTIAO||MP-QQ
			//胶囊按钮
			this.size.button = uni.getMenuButtonBoundingClientRect();
			this.size.navbar = this.size.button.bottom;
			// #endif

			// #ifdef H5
			this.size.button = { bottom: 56, height: 32, left: 281, right: 368, top: 24, width: 87 };
			this.size.navbar = this.size.button.bottom;
			// #endif
			// console.log('this.size.button', this.size.button)

			// #ifdef APP-PLUS
			// console.log('plus.os', plus.os)
			// console.log('plus.runtime', plus.runtime)
			this.os = plus.os.name.toLowerCase(); //操作系统，android或ios
			this.osver = plus.os.version; //操作系统版本号
			this.version = import.meta.env.VITE_VERSION || conf.version; //热更包版本号

			this.packName = plus.weex.config.env.appName; //包名
			this.appid = plus.runtime.appid; //如：__UNI__123456
			// this.debug = !!plus.weex.config.env.debugMode; //开发环境
			// this.option = plus.runtime.arguments;
			//调用plus.device.imei、plus.device.imsi、plus.device.uuid 不会触发授权提示框
			// console.log('plus.runtimeplus.runtimeplus.runtimeplus.runtime')
			// console.log(plus.runtime)

			if (this.os === 'android') {
				plus.device.getOAID({
					success: (res) => {
						// console.log('plus.device.getOAID', res)
						this.oaid = res.oaid;
					},
					fail: err => {
						// console.error('plus.device.getOAID', this.os, err);
						this.simulator++;
					}
				});
				plus.device.getAAID({
					success: (res) => {
						// console.log('plus.device.getAAID', res)
						this.aaid = res.aaid;
					},
					fail: err => {
						// console.error('plus.device.getAAID', err);
						this.simulator++;
					}
				});
			}


			plus.device.getInfo({
				success: (res) => {
					// console.log('plus.device.getInfo', res)
					if (res.uuid) this.uuid = res.uuid; //重装APP可能会变
					if (res.imei) this.imei = res.imei;
					if (res.imsi) this.imsi = res.imsi;
				},
				fail: err => {
					// console.error('plus.device.getInfo', err);
					this.simulator++;
				}
			});
			// #endif


			for (let k in conf) {
				if (k === 'ua') {
					//#ifndef H5 || MP
					//h5和小程序不可以自定义
					this.ua = (conf.ua || 'Mozilla/5.0 ({os}/{osver} {brand}/{model})').re(this);
					//#endif
				}
				else {
					this[k] = conf[k];
				}
			}
		}
		catch (e) {
			console.error(e);
		}

	}



	/**
	 * 设置屏幕常亮
	 * 
	 * @param {Object} keep
	 */
	Wakelock(keep = true) {
		keep = Boolean(keep);
		//#ifndef H5
		uni.setKeepScreenOn({
			keepScreenOn: keep
		});
		//#endif
		//#ifdef APP-PLUS
		plus.device.setWakelock(keep);
		//#endif
	}

	device() {
		return {
			system: this.system,
			brand: this.brand,
			model: this.model,
			devid: this.devid,
			appid: this.appid,
			version: this.version,
			theme: this.theme,

			//#ifdef APP-PLUS
			packName: this.packName,
			simulator: this.simulator, //模拟器可能性判断，oaid,aaid,uuid其中任一个读取出错各加1
			oaid: this.oaid,
			aaid: this.aaid,
			imei: this.imei,
			uuid: this.uuid,
			imsi: this.imsi,
			//#endif
		}
	}


	/**
	 * 为了防止快速点按返回键导致程序退出重写quit方法改为隐藏至后台
	 * 重写toast方法如果内容为 ‘再次返回退出应用’ 就隐藏应用，其他正常toast
	 */
	bcrun() {
		let main = plus.android.runtimeMainActivity();
		plus.runtime.quit = function() {
			main.moveTaskToBack(false);
		};

		plus.nativeUI.toast = (function(str) {
			// console.log('plus.nativeUI.toast', str)
			/**
			 * 再次返回退出应用
			 */
			if (str == '再按一次退出应用') {
				plus.runtime.quit();
			}
			else {
				uni.showToast({
					title: '再按一次退出应用啦',
					icon: 'none'
				})
			}
		});

	}


}