const { src, dest, parallel, series, watch } = require('gulp');

const browserSync = require('browser-sync').create();

const rename = require('gulp-rename');
const plumber = require("gulp-plumber");
const newer = require('gulp-newer');
const rigger = require('gulp-rigger');
const notify = require('gulp-notify');
const del = require('del');
const sourcemaps = require("gulp-sourcemaps");
const gulpif = require('gulp-if');
const argv = require('yargs').argv;
const uglify = require('gulp-uglify');
const fs = require('fs');

const sass = require('gulp-sass');
const cleancss = require('gulp-clean-css');
const autoprefixer = require('gulp-autoprefixer');
const gcmq = require('gulp-group-css-media-queries');

const ttf2woff2 = require('gulp-ttf2woff2');

const imagemin = require('gulp-imagemin');
const svgSprite = require('gulp-svg-sprite');

// Path variables
let path = {
	build: {
		html: './build',
		css: './build/css/',
		js: './build/scripts/',
		images: "./build/images/",
		sprites: "./build/images/",
		fonts: "./build/fonts/",
	},
	src: {
		html: './app/views/*.html',
		css: './app/styles/**/*.scss',
		js: './app/scripts/main.js',
		images: './app/assets/images/**/*',
		sprites: "./app/assets/images/sprites/**/*.svg",
		fonts: './app/assets/fonts/**/**/*.ttf'
	},
	watch: {
		html: './app/views/**/*.html',
		css: './app/styles/**/*.scss',
		js: './app/scripts/**/**/*.js',
		images: './app/assets/images/**/*',
		sprites: "./app/assets/images/**/*.svg",
	},
	clean: "./build"
}


function views() {
	return src(path.src.html)
		.pipe(rigger())
		.pipe(dest(path.build.html))
		.pipe(browserSync.stream())
}

function styles() {
	return src(path.src.css)
		.pipe(gulpif(argv.prod, sourcemaps.init()))
		.pipe(plumber({
			errorHandler: function (err) {
				notify.onError({
					title: "Ошибка в CSS",
					message: "<%= error.message %>"
				})(err);
			}
		}))
		.pipe(sass.sync({
			outputStyle: "expanded"
		}))
		.pipe(gulpif(argv.prod, autoprefixer({
			overrideBrowserslist: [" last 2 version "],
			cascade: false,
			grid: true
		})))
		.pipe(gulpif(argv.prod, cleancss({
			level: 2,
		}, details => {
			console.log(`${details.name}: Original size:${details.stats.originalSize} - Minified size: ${details.stats.minifiedSize}`)
		})))
		.pipe(rename({ suffix: '.min' }))
		.pipe(gcmq())
		.pipe(gulpif(argv.prod, sourcemaps.write()))
		.pipe(dest(path.build.css))
		.pipe(browserSync.stream())
}

function scripts() {
	return src(path.src.js)
		.pipe(rigger())
		.pipe(plumber({
			errorHandler: function (err) {
				notify.onError({
					title: "Ошибка в JavaScript",
					message: "<%= error.message %>"
				})(err);
			}
		}))
		.pipe(gulpif(argv.prod, sourcemaps.init()))
		.pipe(rename({ suffix: '.min' }))
		.pipe(gulpif(argv.prod, uglify()))
		.pipe(gulpif(argv.prod, sourcemaps.write()))
		.pipe(dest(path.build.js))
		.pipe(browserSync.stream())
}


function images() {
	return src(['./app/assets/images/**/*'])
		.pipe(newer(path.build.images))
		.pipe(imagemin({
			interlaced: true,
			progressive: true,
			optimizationLevel: 5,
			svgoPlugins: [
				{
					removeViewBox: true
				}
			]
		}))
		.pipe(dest(path.build.images))
		.pipe(browserSync.stream())
}

function svgSprites() {
	return src('./app/assets/images/sprites/**/*.svg')
		.pipe(svgSprite({
			mode: {
				stack: {
					sprite: "../sprites.svg" //sprite file name
				}
			},
		}))
		.pipe(dest('./build/images'));
}

function fonts() {
	return src(path.src.fonts)
		.pipe(newer(path.build.fonts))
		.pipe(ttf2woff2())
		.pipe(dest(path.build.fonts))
}


function clean() {
	return del(path.clean)
}


function startwatch() {
	browserSync.init({
		server: {
			baseDir: 'build/',
			chrome: '-browser "chrome.exe"',
			port: 8080,
			notify: false
		},
		notify: false,
		online: true
	})

	watch(path.watch.html, parallel('views'))
	watch(path.watch.css, parallel('styles'))
	watch(path.watch.js, parallel('scripts'))
	watch(path.watch.images, parallel('images'))
	watch(path.watch.sprites, parallel('svgSprites'))
}

exports.views = views;
exports.styles = styles;
exports.scripts = scripts;
exports.images = images;
exports.fonts = fonts;
exports.clean = clean;
exports.svgSprites = svgSprites;

exports.default = series(clean, parallel(views, styles, scripts, images, svgSprites, fonts), startwatch)