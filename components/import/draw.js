export default {
	methods: {
		drawStar(data) {
			if (this.drawIng) return;
			this.drawIng = true;
			console.log('drawData:', data || this.data);
			this.$emit('speed', '开始绘图');
			let canvasData = JSON.parse(JSON.stringify(data || this.data));
			//按index进行排序，值大的在后面，最后绘
			canvasData.sort(function(a, b) {
				if (!a.index) a.index = 0;
				if (!b.index) b.index = 0;
				return String(a.index * 1).localeCompare(b.index * 1)
			});
			this.total = canvasData.length;
			let PromiseTask = [];
			canvasData.forEach((item, p) => {
				if (item.type !== 'img' && item.type !== 'image') return;
				PromiseTask.push(new Promise((resolve, reject) => {
					let img = item.src;
					this.$emit('speed', `(${p})加载图片`);
					uni.downloadFile({
						url: item.src,
						success: res => {
							PromiseTask.push(new Promise((resolve2, reject2) => {
								uni.getImageInfo({
									src: res.tempFilePath,
									success: (image) => {
										item.src = res
											.tempFilePath;
										resolve(res)
									},
									fail: (err) => {
										reject({
											errMsg: `(${p})图片格式错误，无法读取，本次任务失败`
										});
										console.error(
											`(${p})图片格式错误，无法读取，本次任务失败`,
											item, err)
									}
								});
							}))
						},
						fail: err => {
							reject({
								errMsg: `(${p})图片无法下载，本次任务失败`
							})
							console.error(`(${p})图片无法下载，本次任务失败`, img, err)
						}
					})
				}));
			});
			if (PromiseTask.length > 0) {
				Promise.all(PromiseTask).then(
					res => {
						console.log('Promise.all success', res)
						this.drawData(canvasData);
					},
					err => {
						console.log('Promise.all fail', err)
						this.$emit('error', err.errMsg);
					}
				);
			}
			else {
				this.drawData(canvasData);
			}
		},
		drawData(data) {
			console.warn('drawData:', data);
			const ctx = uni.createCanvasContext(this.canvasId, this);
			ctx.save();
			ctx.clearRect(0, 0, this.width, this.height);
			ctx.setFillStyle(this.background)
			ctx.fillRect(0, 0, this.width, this.height)
			ctx.draw();
			data.forEach((item, i) => {
				console.log('speed', `绘元素(${i}).${item.type}`)
				this.$emit('speed', `绘元素(${i}).${item.type}`);
				ctx.restore(); //每个项目开始前先恢复初始设置
				if (item.x < 0) item.x = this.width + item.x;
				if (item.y < 0) item.y = this.height + item.y;
				if (!item.alpha) item.alpha = 1;
				if (item.alpha) ctx.setGlobalAlpha(item.alpha)
				item.finish = 0;
				switch (item.type) {
					case 'rect':
						this.drawRect(ctx, item);
						break;
					case 'text':
						this.drawText(ctx, item);
						break;
					case 'img':
					case 'image':
						this.drawImg(ctx, item);
						break;
					case 'circular':
						this.drawCircular(ctx, item);
						break;
					case 'line':
						this.drawLine(ctx, item);
						break;
					case 'clear':
						this.drawLine(ctx, item);
						break;
				}
				this.draw(ctx, item);
			});

			let count = 0;
			let tm = setInterval(() => {
				let i = 0;
				data.forEach(obj => {
					if (!obj.finish) i++;
				});

				if (i === 0 || count++ > 5) {
					clearInterval(tm)
					uni.canvasToTempFilePath({
						x: 0,
						y: 0,
						width: this.width,
						height: this.height,
						fileType: 'png',
						canvasId: this.canvasId,
						success: (res) => {
							//这里获取的是base64码，可以直接用于image
							this.$emit('save', res.tempFilePath);
							this.drawIng = false;
						},
						fail: (err) => {
							console.error('canvasToTempFilePath', err);
							this.drawIng = false;
							this.$emit('error', err.errMsg);
						}
					}, this);
				}

			}, 200);

		},
		drawCircular(ctx, item) { //画圆
			ctx.arc(item.x, item.y, item.radius, 0, 2 * Math.PI)
			ctx.setFillStyle(item.color)
			ctx.fill()
		},
		drawClear(ctx, item) { //清除某个区域
			ctx.clearRect(item.x, item.y, item.width, item.height)
		},
		drawLine(ctx, item) { //画线
			let {
				color,
				width,
				height,
				cap,
				join,
				dash,
				x,
				y,
				point,
				relative
			} = item;
			ctx.setStrokeStyle(color)
			ctx.setLineWidth(width || 10)
			ctx.setLineCap(cap || 'round') //'butt'平角、'round'圆角、'square'
			ctx.setLineJoin(join || 'miter') //'bevel'斜面、'round'圆角，'miter'斜角
			if (dash) ctx.setLineDash(dash.pattern, dash.offset);
			ctx.moveTo(x, y)
			if (point) {
				point.forEach(p => {
					ctx.lineTo(p[0], p[1])
				})
			}
			else {
				relative.forEach(p => {
					x += p[0], y += p[1];
					ctx.lineTo(x, y)
				})
			}

			ctx.stroke()
		},
		drawText(ctx, item) {
			if (!item.line || item.line === 0) item.line = 1;
			if (!item.lineHeight || item.lineHeight === 0) item.lineHeight = 2; //行距
			if (!item.size) item.size = 12;
			if (!item.padding) item.padding = 0;
			if (typeof item.padding === 'number') { //上下，左右
				item.padding = [item.padding, item.padding];
			}
			ctx.setFontSize(item.size);
			if (item.align) {
				if (!item.x) item.x = 0;
				if (!item.width) item.width = this.width;
				if (item.align === 'center') {
					let mea = ctx.measureText(item.text);
					item.x += (item.width - mea.width) / 2;
					item.width = mea.width;
					item.padding[1] = 0;
				}
				else if (item.align === 'right') {
					let mea = ctx.measureText(item.text);
					item.x += (item.width - mea.width);
					item.width = mea.width;
					item.padding[1] = 0;
				}
			}

			if (!item.width) {
				let mea = ctx.measureText(item.text)
				item.width = mea.width + item.padding[1] * 2;
				if (item.width > this.width) item.width = this.width;
			}
			if (!item.height) {
				item.height = ((item.size + item.lineHeight) * item.line - item.lineHeight + item.padding[0] * 2);
			}
			let xy = [item.x, item.y];

			console.log('text', JSON.stringify(item))
			if (item.background) {
				let bg = {
					type: 'extend',
					color: item.background,
					x: item.x,
					y: item.y,
					width: item.width,
					height: item.height,
					alpha: 1,
				};
				this.drawRect(ctx, bg)
			}
			item.y += item.size;
			let width = item.width - item.padding[1] * 2;
			let height = item.height - item.padding[0] * 2;
			item.x += item.padding[1];
			item.y += item.padding[0];

			if (item.alpha) ctx.setGlobalAlpha(item.alpha)
			ctx.setFillStyle(item.color);
			ctx.setTextAlign('left');
			// ctx.setTextBaseline('bottom')
			if (!item.width || item.line === 1) {
				//不指定宽，直接显示整行
				if (item.shade) {
					// ctx.setShadow(item.shade.x, item.shade.y, 50, item.shade.color)
					ctx.setFillStyle(item.shade.color);
					ctx.fillText(item.text, item.x + item.shade.x, item.y + item.shade.y);
				}
				ctx.setFillStyle(item.color);
				ctx.fillText(item.text, item.x, item.y);
				// ctx.strokeText(item.text, item.x, item.y, 300)
				return;
			}
			let metrics;
			let stop = 0;
			let star = 0; //每次开始截取的字符串的索引

			for (let i = 0; i < item.text.length; i++) {
				metrics = ctx.measureText(item.text.substring(star, i))
				if (metrics.width >= width) {
					stop = i;
					if (metrics.width > width) stop -= 1;
					ctx.fillText(item.text.substring(star, stop), item.x, item.y); //绘制截取部分
					item.y += (item.size + item.lineHeight);
					star = stop;
					item.line--;
					if (item.line <= 1) break;
				}
			}
			let len = Math.floor(width / item.size);
			// console.log(item.line, star, len, len);
			if (item.line > 0 && star < item.text.length) {
				ctx.fillText(item.text.substring(star, len + star), item.x, item.y);
			}
			if (item.radius) {
				item.x = xy[0];
				item.y = xy[1];
				this.drawRadius(ctx, item);
			}
		},

		drawRect(ctx, item) {
			console.log('rect', JSON.stringify(item))
			ctx.setFillStyle(item.color)
			if (item.rotate) ctx.rotate(item.rotate * Math.PI / 180)
			if (item.alpha) ctx.globalAlpha = item.alpha;
			ctx.fillRect(item.x, item.y, item.width, item.height)
			if (item.rotate) ctx.rotate(360 - item.rotate * Math.PI / 180)
			if (item.radius) this.drawRadius(ctx, item);
		},
		drawImg(ctx, item) {
			if (item.download === 0) {
				console.log('img Not Download', JSON.stringify(item))
				return;
			}
			console.log('img', JSON.stringify(item))
			if (!item.padding) item.padding = 0;
			if (item.padding > 0) {
				let bg = {
					type: 'extend',
					color: item.background || '#fff',
					x: item.x,
					y: item.y,
					width: item.width,
					height: item.height,
					alpha: 1,
				};
				this.drawRect(ctx, bg)
			}
			if (item.alpha) ctx.globalAlpha = item.alpha;
			let opt = [item.src];
			if (item.area) {
				opt.push(...item.area, item.x + item.padding, item.y + item.padding,
					item.width - item.padding * 2, item.height - item.padding * 2);
			}
			else {
				opt.push(item.x + item.padding, item.y + item.padding,
					item.width - item.padding * 2, item.height - item.padding * 2);
			}
			ctx.drawImage(...opt);

			if (item.radius) this.drawRadius(ctx, item);
		},
		drawRadius(ctx, item) {
			ctx.setFillStyle(item.radiusBackground || this.background)

			let {
				width,
				height,
				x,
				y,
				padding,
				radius
			} = item;

			if (typeof radius === 'number' || typeof radius === 'string') {
				radius = Array.from(Array(4), (v, k) => radius);
			}
			radius.forEach((r, i) => {
				if (String(r).indexOf('%') > 0) {
					radius[i] = ((width + height) / 2 + padding * 2) * (parseFloat(r) / 100);
				}
				else {
					radius[i] = parseInt(r);
				}
			});

			//pi从3点钟方向开始，这里分别是12/3/6/9点钟的pi值
			let pi = [Math.PI * 3 / 2, 0, Math.PI / 2, Math.PI];

			//右上角
			if (radius[0]) {
				ctx.beginPath();
				ctx.arc(x + width - radius[0], y + radius[0], radius[0], pi[0], pi[1])
				ctx.lineTo(x + width, y);
				ctx.closePath();
				ctx.fill()
			}

			//右下角
			if (radius[1]) {
				ctx.beginPath();
				ctx.arc(x + width - radius[1], y + height - radius[1], radius[1], pi[1], pi[2])
				ctx.lineTo(x + width, y + height);
				ctx.closePath();
				ctx.fill()
			}

			//左下角
			if (radius[2]) {
				ctx.beginPath();
				ctx.arc(x + radius[2], y + height - radius[2], radius[2], pi[2], pi[3])
				ctx.lineTo(x, y + height);
				ctx.closePath();
				ctx.fill()
			}


			//左上角
			if (radius[3]) {
				ctx.beginPath();
				ctx.arc(x + radius[3], y + radius[3], radius[3], pi[3], pi[0])
				ctx.lineTo(x, y);
				ctx.closePath();
				ctx.fill()
			}

		},
		draw(ctx, item) {
			ctx.draw(true, setTimeout(() => {
				item.finish = 1;
				if (item.type !== 'extend') this.finish++;
				this.$emit('speed', Math.ceil((this.finish / this.total) * 100) + '%');
			}, 50));
		},
	},

}