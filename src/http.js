/**
 * toast最少显示长时间，主要是加载api的读取中后续关闭
 */
const tstShow = 350;
const isDebug = (process.env.NODE_ENV === 'development');
// const isDebug = true;
const nextPost = [];

const baseResp = {
	success: 1,
	error: 0,
	message: '',
	data: {}
};

const toastConf = {
	'l': '加载中...',
	'r': '读取中...',
	'f': '正在刷新...',
	's': '保存中...',
	'd': '删除中...',
	'm': '发送短信...',
	'p': '请求支付...',
};

const aliasConf = {};

const config = {
	path: '', //API根目录
	timeout: 6000, //请求最大耗时
	mintime: 100, //两次modal或toast之间间隔最短时间，小于此时间的不显示
	detection: 0, //检测相同API连续请求间隔，小于此时间的报错，0不检测
};

let processor;

let justModalTime = 0;
let justPostTime = 0;
let justPostApi = '';



const _request = class {

	constructor(uri, data, method) {
		this.method = method.toUpperCase();
		if (!data || data === undefined) data = {};
		if (typeof data !== 'object') data = { value: data };
		if ((typeof uri !== 'string') || (!uri)) {
			console.error('error', uri)
			throw new Error('api 请求目标必须是string类型地址，且必填');
		}

		if ((nextPost.length > 0) && (this.method === 'POST')) {
			data._append = JSON.parse(JSON.stringify(nextPost));
			nextPost.length = 0;
		}

		let host = config.path;

		if (uri[0] === '!') { //uri第1个字符为!，静默处理
			this.silent = true;
			uri = uri.slice(1);
		}

		if (uri[0] === '@') { //uri第1个字符为@，不进行频率检查
			uri = uri.slice(1);
		}

		if (uri.slice(0, 4) === 'http') {
			//https://domain.com/cont/action
			let tmp = uri.split('/');
			uri = '/' + tmp.slice(3).join('/'); //提取URL中的uri部分
			host = `${tmp[0]}//${tmp[2]}`; //提取URL中的host部分
		}

		if (uri[0] !== '/') { //uri第1个字符为toast，提取出来
			this.toast = toastConf[uri[0]] || '';
			uri = uri.slice(1);
		}

		this.api = host + apiAlias(uri);
		this.request = data;
	}

	api = '';
	method = 'POST';
	code = 0;
	message = '';
	silent = false; // 直接返回
	loading = false;
	encode = 'json';
	timeout = config.timeout;
	toast = '';
	header = {
		put: {}, //发出的head
		get: {}, //收到的head
	};

	timer = {
		used: 0,
		ready: 0,
		before: 0,
		after: 0,
	};

	error = {};
	request = {};
	response = {};
}


function apiAlias(api) {
	let uri = api.split('/');
	if (!uri[1]) uri[1] = 'index';
	if (!uri[2]) uri[2] = 'index';
	let a = `/${uri[1]}`;
	let b = `/${uri[1]}/${uri[2]}`;

	if (aliasConf[b]) {
		let append = uri.slice(3).join('/');
		return `${aliasConf[b]}/${append}`;
	}

	if (aliasConf[a]) {
		let append = uri.slice(2).join('/');
		return `${aliasConf[a]}/${append}`;
	}

	return api;
}

/**
 * 请求后台数据出错时，统一弹窗
 */
function failMessage(REQ, resolve, reject) {

	if (!REQ.message) REQ.message = '';
	if (REQ.message.indexOf('cert.CertPathValidator') > 0) {
		//证书路径错误，基本上发生在被抓包的时候
		REQ.loading = false;
		uni.hideLoading();
		uni.showToast({
			title: '网络错误或证书错误',
			icon: 'none'
		});
		reject({ error: 1, message: '网络错误或证书错误' });
		return;
	}
	if (typeof reject !== 'function') reject = () => {};

	if (REQ.silent) { //请求者要求直接返回，这里不做任何处理
		REQ.loading = false;
		uni.hideLoading();
		reject(REQ.response);
		return;
	}
	REQ.loading = false;
	uni.hideLoading();

	if (!REQ.message) return;

	let now = Date.now();
	if (now - justModalTime < config.mintime) return;
	justModalTime = now;

	if (REQ.response.modal) {
		const { title, message, cancel } = REQ.response.modal;
		uni.showModal({
			showCancel: Boolean(cancel || false),
			title: title || '请求数据失败',
			content: message || REQ.message,
			success(res) {
				REQ.response.confirm = res.confirm;
				if (cancel) {
					if (res.confirm) resolve(REQ.response);
					else reject(REQ.response);
				}
				else if (res.confirm) {
					reject(REQ.response);
				}
			}
		});
		return;
	}

	if (REQ.response.toast) {
		const { timeout, icon } = REQ.response.toast;
		uni.showToast({
			duration: parseInt(timeout || 3000),
			title: REQ.message,
			icon: (icon || 'none'),
			success() {
				reject(REQ.response)
			}
		});
		return;
	}

	uni.showToast({
		duration: 3000,
		title: REQ.message,
		icon: 'none',
		success() {
			reject(REQ.response)
		}
	});

}

function doSuccess(REQ, res, resolve, reject) {
	if (!REQ.timer.after) REQ.timer.after = Date.now();
	if (typeof res.data === 'string') {
		res.data = {
			message: res.data,
			error: 506
		};
	}
	REQ.header.get = res.header;
	REQ.message = res.errMsg;
	REQ.code = res.statusCode;
	REQ.error = res.data.error || 0;
	REQ.response = processor.response(res.data, REQ);
	if (REQ.response === null) return;

	try {
		if (REQ.code >= 200 && REQ.code < 210) { //服务器正常返回
			// console.log(REQ);
			if (REQ.response.error === 0) {
				resolve(REQ.response);
			}
			else {
				//业务逻辑出错，如后端主动返回500等信息
				REQ.message = REQ.response.message || '';
				failMessage(REQ, resolve, reject);
			}
		}
		else {
			if (typeof REQ.response === 'string') {
				//系统级错误，比如请求了非法资源，多为nginx出错，或PHP直接exit，得到的是一个字符串
				let p = /<title>(.+)<\/title>/.exec(REQ.response);
				if (p) {
					REQ.message = p[1] || '';
					REQ.error = 10;
					Object.assign(REQ.response, baseResp, {
						success: 0,
						error: 9,
						message: p[1]
					})
					failMessage(REQ, resolve, reject);
				}
				else {
					//非html错误，只是一个字符串
					REQ.error = 11;
					REQ.message = REQ.response || '';
					REQ.response = Object.assign({}, baseResp, {
						success: 0,
						error: 12,
						message: REQ.response
					})
					failMessage(REQ, resolve, reject);
				}
			}
			else {
				//PHP框架级错误，得到的是一个json格式错误信息，基本为php直接返回非200的状态
				REQ.error = REQ.response.error || 502;
				REQ.message = REQ.response.message || '系统异常';
				Object.assign(REQ.response, baseResp, {
					success: 0,
					error: REQ.error,
					message: REQ.message
				});
				failMessage(REQ, resolve, reject);
			}
		}
	}
	catch (err) {
		//上面try里自身出错
		console.error(err)
		REQ.error = 9;
		REQ.message = err.description || err.message || '系统错误';
		Object.assign(REQ.response, baseResp, {
			success: 0,
			error: 9
		});
		failMessage(REQ, resolve, reject);
	}
}

function doFail(request, res, resolve, reject) {

	if (res.errMsg.indexOf('Failed to connect') > 0) {
		let info = res.errMsg.match(/([\w\.]+)\/([\d\.]+)\:(\d+)/);
		if (info) res.info = {
			domain: info[1],
			host: info[2],
			port: info[3]
		}
		res.errMsg = "服务器连接失败:" + info[2];
	}
	else if (res.errMsg.indexOf('timeout') > 0) {
		res.errMsg = '连接服务器超时，请检查网络';
	}
	else if (res.errMsg.indexOf('Unable to resolve host') > 0) {
		res.errMsg = '域名解析失败';
	}

	res.message = res.errMsg;
	request.response = res;
	request.header.get = res.header;
	request.message = res.errMsg;
	request.code = res.statusCode || -1;
	request.error = 1;
	failMessage(request, resolve, reject);
}

function doComplete(request, res, resolve, reject) {
	request.timer.used = request.timer.after - request.timer.before;
	request.timer.used = (request.timer.used / 1000) + 's';
	request.timer.ready = request.timer.ready / 1000;
	request.timer.before = request.timer.before / 1000;
	request.timer.after = request.timer.after / 1000;

	if (request.toast && (tstShow > 0)) {
		if (request.timer.used > tstShow) {
			if (request.loading) uni.hideLoading();
		}
		else {
			setTimeout(function() {
				if (request.loading) uni.hideLoading();
			}, tstShow - request.timer.used);
		}
	}

	console.log(request)
}


async function doRequest(request) {

	if (request.toast) {
		request.loading = true;
		uni.showLoading({
			title: request.toast,
			mask: true
		});
	}


	return new Promise(async (resolve, reject) => {
		request.timer.ready = Date.now();
		console.log('======');
		request.header.put = await processor.header(request.api, request.request, request.method);
		console.log(request);

		const contType = (request.method === 'UPLOAD') ? 'multipart/form-data' : 'application/json';
		request.header.put['content-type'] = contType;
		delete request.header.put['referer'];

		request.timer.before = Date.now();


		uni.request({
			url: request.api,
			method: request.method,
			dataType: request.encode,
			timeout: request.timeout,
			data: request.request,
			header: request.header.put,
			success: (res) => {
				console.log('http success', res);
				request.timer.after = Date.now();
				doSuccess(request, res, resolve, reject);
			},
			fail: (res) => {
				console.log('http fail', res);
				request.timer.after = Date.now();
				doFail(request, res, resolve, reject);
			},
			complete: (res) => {
				console.log('http complete', res);
				doComplete(request, res, resolve, reject);
			}
		});

	});
}


function thisPost(api, data = {}) {
	return doRequest(new _request(api, data, 'post'));
}


/**
 * @param {Object} option
 */
/**
 * @param {Object} uri
 * @param {Object} option
 * 
 * config='/upload/aliyun'
 * save=`s/upload/save/`
 * 
 */
async function doUploadAliYun(uri, option) {

	return new Promise(async (resolve, reject) => {
		let { file, mime, used, source } = option;
		if (!source) source = 'unknow';
		if (!mime) mime = 'image/png';
		// console.log({ file, mime, used, source });

		//向服务器请求签名，再传到阿里OSS
		thisPost(uri, { mime, used }).then(
			resConf => {

				//直接传到阿里云 ，name默认为 'file',
				const { url, formData, name, save } = resConf.data;
				// console.log({ url, formData, name });
				if (!url) {
					return reject({ success: false, error: 505, message: `服务器未响应有效数据` });
				}

				uni.uploadFile({
					url,
					formData,
					name,
					filePath: file,
					success: resUp => {

						/**
						 * resUp.data是由阿里云向callback请求时所得到的值，
						 * 也就是上面请求config时进行signature设置的callbackBody
						 */
						console.log({ resUp });

						if (resUp.statusCode === 200) {
							let fileInfo = JSON.parse(resUp.data);
							fileInfo.used = used;

							thisPost(save, fileInfo).then(
								resEnd => {
									resolve(resEnd);
								},
								errEnd => {
									reject(errEnd);
								}
							);
						}
						else if (resUp.data) {
							const code = resUp.data.match(/<Code>(.*?)<\/Code>/);
							const msg = resUp.data.match(/<Message>(.*?)<\/Message>/);
							reject({ success: false, error: resUp.statusCode, message: `${code[1]}:${msg[1]}` });
						}

						else {
							reject({ success: false, error: resUp.statusCode, message: `上传失败` });
						}


					},
					fail: errUp => {
						// console.log({ errUp });
						reject(errUp);
					}
				});

			},
			errConf => {
				// console.log({ errConf })
				reject(errConf);
			}
		);






	})
}


/**
 * 操作频率检查
 * @param {Object} api
 */
async function FrequencyDetection(api) {

	if (api[0] === '@') return null; //不检查频率

	let nowTime = Date.now();

	if (api === justPostApi && nowTime - justPostTime < config.detection) {
		// console.log({ nowTime, justPostTime, just: nowTime - justPostTime, detection: config.detection });

		return new Promise((resolve, reject) => {
			reject({ error: 1, success: 0, message: '操作太频繁' })
		});

	}

	justPostTime = nowTime;
	justPostApi = api;

	return null; //操作正常，可以继续
}



async function downloadFile(url, callback) {

	const key = url.md5();

	async function download_file(path) {
		return new Promise((resolve, reject) => {

			const task = uni.downloadFile({
				url: path,
				success: (res) => {
					if (res.statusCode === 200) {
						console.log('下载成功', res);
						//#ifdef H5
						uni.setStorageSync(key, { file: res.tempFilePath });
						resolve({ success: true, file: res.tempFilePath })
						//#endif

						//#ifndef H5
						uni.saveFile({
							tempFilePath: res.tempFilePath,
							success: (file) => {
								console.log('保存成功', file);
								uni.setStorageSync(key, { file: file.savedFilePath });
								resolve({ success: true, file: file.savedFilePath })
							},
							fail: err => {
								resolve({ success: false, message: err.errMsg })
							}
						});
						//#endif
					}
					else {
						console.log('download null', { res })
						resolve({ success: false, message: '文件不存在' })
					}
				},
				fail: err => {
					console.log('download error', { err })
					resolve({ success: false, message: err.errMsg })
				}
			});

			task.onProgressUpdate((res) => {
				// console.log('下载进度', res.progress, progress);
				// console.log('已经下载的数据长度', res.totalBytesWritten);
				// console.log('预期需要下载的数据总长度', res.totalBytesExpectedToWrite);
				// 满足测试条件，取消下载任务。
				// if (res.progress > 50000) { task.abort(); }

				if (typeof callback === 'function') callback(task, res);

			});



		});

	}


	return new Promise(async (resolve, reject) => {

		let cache = uni.getStorageSync(key);
		if (!cache) return resolve(await download_file(url));

		uni.getSavedFileInfo({
			filePath: cache.file,
			success: async (res) => {
				if (res.size > 0) {
					console.log('从缓存读取成功', cache, res);
					return resolve(cache)
				}

				console.log('从缓存读取成功，但是空文件', cache, res);
				resolve(await download_file(url))
			},
			fail: async (err) => {
				console.log('从缓存读取失败', cache, err);
				resolve(await download_file(url))
			}
		});

	});

}



export default class {
	processor = null;

	constructor(pro, conf) {
		this.processor = processor = pro;
		for (let k in config) config[k] = conf[k];
		if (conf.toast) Object.assign(toastConf, conf.toast);
		if (conf.alias) Object.assign(aliasConf, conf.alias);
		if (isDebug) console.log(config);
	}

	async get(api, data = {}) {
		if (config.detection > 0) {
			const fd = await FrequencyDetection(api);
			if (fd) return fd;
		}

		return await doRequest(new _request(api, data, 'get'));
	}

	async post(api, data = {}) {
		if (config.detection > 0) {
			const fd = await FrequencyDetection(api);
			if (fd) return fd;
		}

		return await doRequest(new _request(api, data, 'post'));
	}

	next(data) {
		/**
		 * 下一次post时请求时携带，后端用_append获取
		 * 主要用于发送不紧急的数据，没必要发起一次http请求
		 * 数据是array，后端遍历读取即可
		 */
		// if (data === undefined) return JSON.parse(JSON.stringify(nextPost));
		if (data === undefined) return [...nextPost];

		if (data === 'clear') {
			nextPost.length = 0;
			return;
		}

		nextPost.push(data);
	}

	async upload(uri, option) {
		return await doUploadAliYun(uri, option);
	}

	async download(uri, callback) {
		return await downloadFile(uri, callback);
	}



};