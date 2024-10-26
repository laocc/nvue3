/**
 * toast最少显示长时间，主要是加载api的读取中后续关闭
 */
const tstShow = 350;
// const isDebug = (process.env.NODE_ENV === 'development');
const isDebug = true;

const baseResp = {
	success: 1,
	error: 0,
	message: '',
	data: {}
};

const config = {
	path: '',
	token: '',
	modal: false, //出错时显示model，否则显示toast
	timeout: 6000,
	mintime: 100, //两次modal或toast之间间隔最短时间，小于此时间的不显示
	toast: {
		'l': '加载中...',
		'r': '读取中...',
		'f': '正在刷新...',
		's': '保存中...',
		'd': '删除中...',
		'm': '发送短信...',
		'p': '请求支付...',
	},
	alias: {}
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
			this.toast = config.toast[uri[0]] || '';
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
		before: 0,
		after: 0,
		used: 0,
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

	if (config.alias[b]) {
		let append = uri.slice(3).join('/');
		return `${config.alias[b]}/${append}`;
	}

	if (config.alias[a]) {
		let append = uri.slice(2).join('/');
		return `${config.alias[a]}/${append}`;
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
	if (!request.timer.after) request.timer.after = Date.now();
	// console.error('uni.request Fail：', request, JSON.stringify(res));

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
	request.timer.useTime = (request.timer.used / 1000) + 's';

	/**
	 * 1727661448.089
	 */

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

	if (isDebug) console.log(request)
}


function doRequest(request) {

	if (request.toast) {
		request.loading = true;
		uni.showLoading({
			title: request.toast,
			mask: true
		});
	}

	return new Promise(async (resolve, reject) => {
		request.timer.before = Date.now();
		request.header.put = await processor.header(request.api, request.request, request.method);

		const contType = (request.method === 'UPLOAD') ? 'multipart/form-data' : 'application/json';
		request.header.put['content-type'] = contType;
		delete request.header.put['referer'];

		uni.request({
			url: request.api,
			method: request.method,
			dataType: request.encode,
			timeout: request.timeout,
			data: request.request,
			header: request.header.put,
			success: (res) => {
				doSuccess(request, res, resolve, reject);
			},
			fail: (res) => {
				doFail(request, res, resolve, reject);
			},
			complete: (res) => {
				doComplete(request, res, resolve, reject);
			}
		});

	});
}

function cropImg(file) {
	return new Promise((resolve, reject) => {
		uni.getImageInfo({
			src: file.path,
			success(info) {
				resolve({
					path: file.path,
					ext: info.type.toLowerCase(),
					width: info.width,
					height: info.height,
					weight: file.size
				})
			},
			fail(err) {
				// console.log(err);
				reject(err)
			}
		})
	})
}

function upServerFile(request, file) {
	return new Promise((resolve, reject) => {
		request.request.data = JSON.stringify(request.request.data);
		request.request.files = JSON.stringify([file]);
		uni.uploadFile({
			url: request.api,
			filePath: file.path,
			//#ifdef MP-ALIPAY
			fileType: file.ext,
			//#endif
			name: file.name,
			timeout: request.timeout,
			header: request.header.put,
			formData: request.request,
			success: (res) => {
				resolve(res);
			},
			fail: (res) => {
				reject(res);
			}
		});
	})
}

function objectJson(obj) {
	return JSON.parse(JSON.stringify(obj));
}

/**
 * 上传 uni.chooseImage()选择好的文件
 * 
 * @param {Object} choose 是uni.chooseImage({success: (res)})中的res原样
 * @param {Object} saveSpace 0:自己服务器，1:uniCloud
 */
function doUpload_OLD(request, choose) {

	return new Promise((resolve, reject) => {
		request.timer.before = Date.now();
		const fileCount = choose.tempFiles.length;
		const processAll = [];
		for (let i = 0; i < fileCount; i++) {
			processAll.push(cropImg(choose.tempFiles[i]));
		}

		return Promise.all(processAll).then(allFile => {
			return allFile;
		}).then(res => {
			// console.log(res);

			//#ifdef APP-PLUS
			//app可以批量上传
			const files = [];
			for (let i = 0; i < fileCount; i++) {
				res[i].name = `file${i}`;
				files.push({
					name: res[i].name,
					uri: res[i].path
				});
			}
			request.request.files = JSON.stringify(res);
			request.request.data = JSON.stringify(request.request.data);

			uni.uploadFile({
				url: request.api,
				timeout: request.timeout,
				header: request.header.put,
				dataType: request.encode,
				formData: request.request,
				files: files,
				success: (res) => {
					if (isDebug) console.log(res);
					try {
						if (typeof res.data === 'string') res.data = JSON.parse(res.data);
					}
					catch (e) {
						//TODO handle the exception
					}
					doSuccess(request, res, resolve, reject);
				},
				fail: (res) => {
					doFail(request, res, resolve, reject);
				},
				complete: (res) => {
					doComplete(request, res, resolve, reject)
				}
			});
			//#endif

			//#ifndef APP-PLUS
			const processUp = [];
			for (let i = 0; i < fileCount; i++) {
				res[i].name = `file${i}`;
				processUp.push(upServerFile(request, res[i]));
			}

			return Promise.all(processUp).then(
				allFile => {
					let resp = {};
					const files = allFile.map((res, f) => {
						let json = res.data;
						try {
							if (typeof json === 'string') json = JSON.parse(json);
						}
						catch (e) {
							//TODO handle the exception
						}
						resp.data = json;
						resp.header = allFile[0].header;
						resp.errMsg = allFile[0].errMsg;
						resp.statusCode = allFile[0].statusCode;
						return json.data;
					});
					resp.files = files;
					doSuccess(request, resp);
				},
				allError => {
					if (isDebug) console.log('allError', allError);
					doFail(request, allError[0]);
				});
			//#endif

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
function doUploadAliYun(uri, option) {

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
function FrequencyDetection(api) {

	if (api[0] === '@') return null; //不检查频率

	let nowTime = Date.now();
	console.log({ api, nowTime, justPostTime });

	if (api === justPostApi && nowTime - justPostTime < config.mintime) {
		console.log({ nowTime, justPostTime, just: nowTime - justPostTime, min: config.mintime });

		return new Promise((resolve, reject) => {
			reject({
				error: 1,
				success: 0,
				message: '操作太频繁'
			})
		});
	}

	justPostTime = nowTime;
	justPostApi = api;

	return null; //操作正常，可以继续
}


export default class {
	processor = null;

	constructor(pro, conf) {
		this.processor = processor = pro;
		Object.assign(config, conf);
		if (isDebug) console.log(config);
	}

	get(api, data = {}) {
		const fd = FrequencyDetection(api);
		if (fd) return fd;

		return doRequest(new _request(api, data, 'get'));
	}

	post(api, data = {}) {
		const fd = FrequencyDetection(api);
		if (fd) return fd;

		return doRequest(new _request(api, data, 'post'));
	}


	upload(uri, option) {
		return doUploadAliYun(uri, option);
	}



};