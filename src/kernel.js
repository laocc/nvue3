// import 'nodejs_patch'; require('nodejs_patch/uniapp.js')
import 'nodejs_patch/uniapp';
import httpClass from './http';
import softClass from './soft';
import pageClass from './page';

let lastError = '';
let lastWarn = '';


/**
 * globalProperties注入的变量，在<script>中读取：this.$pages.XXXXX
 * 
 * provide注入的变量在页面setup中读取：
 * 
 * const { windowWidth } = inject('$size');
 * const {open} = inject('$pages');
 * 
 */

export default {

	install(app, config, processor, librarys = []) {

		for (let k in librarys) {
			const key = `\$${k}`;
			const obj = new librarys[k](app, config);
			app.config.globalProperties[key] = obj;
			app.provide(key, obj);
		}

		const page = new pageClass(config.maps || {});
		app.config.globalProperties.$pages = page;

		const soft = new softClass();
		app.config.globalProperties.$soft = soft;
		app.provide('$soft', soft);
		app.provide('$size', soft.size);

		const proc = new processor(app);

		const http = new httpClass(proc, config.http);
		app.config.globalProperties.$http = http;
		app.provide('$http', http);

		app.provide('$pages', {
			open(path, param) { return page.open(path, param) },
			load(path, param) { return page.load(path, param) },
			jump(path, param) { return page.jump(path, param) },
			tabbar(path, param) { return page.tabbar(path, param) },
			back(param) { return page.back(param) },
		});

		if (!config.http.error) return;

		app.config.errorHandler = (error, instance, trace) => {
			try {
				if (error === lastError) return;
				lastError = error;
				// console.log({ error, instance, trace });
				console.trace(error)
				console.trace(trace)
				http.post(`!@${config.http.error}/error`, { error, instance, trace });
			}
			catch (err) {
				console.log({ err })
			}
		}

		app.config.warnHandler = (error, instance, trace) => {
			try {
				if (error === lastWarn) return;
				lastWarn = error;
				// console.log({ error, instance, trace });
				console.trace(error)
				console.trace(trace)
				http.post(`!@${config.http.error}/warn`, { error, instance, trace });
			}
			catch (err) {
				console.log({ err })
			}
		}




	}






}