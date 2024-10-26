


# main.js
```
import App from './App';

import { createSSRApp } from 'vue';

import kernel from 'nvue3';

import config from '@/common/config';
import variables from '@/common/variables';

import processor from '@/library/processor';
import library from '@/library/library';
import user from '@/library/user';

export function createApp() {
	const app = createSSRApp(App);

	app.use(kernel, config, processor, { library, user, variables });

	return { app }
}
```

# app.use(……)
`app.use(kernel, config, processor, { library, user, variables });`
前三个元素是固定的，最后`{ library, variables }`可以插入任意多个可以被new的class

# 调用：

## 在`<script>`中
```
this.$http.post(…………);
this.$pages.open(…………);
等等
```


## 在`<script setup>`中
```
const { open, jump } = inject('$pages');
const user = inject('$user');
等等
```





