const gulp = require('gulp');
const concat = require('gulp-concat');
const postcss = require('gulp-postcss');
const order = require('gulp-order');
const csso = require('gulp-csso');

const paths = {
  source: {
    helpers: './helpers/**/*.css',
    components_css: './components/**/*.css',
    all_css: ['./components/**/*.css', './helpers/**/*.css'],
  },
  build: {
    css: '../frontender.info/frontender.info/styles/',
  },
};

gulp.task('css:common', () =>
  gulp
    .src(paths.source.all_css)
    .pipe(postcss())
    .pipe(order(['reset.css']))
    .pipe(concat('styles.css'))
    .pipe(csso())
    .pipe(gulp.dest(paths.build.css)),
);

gulp.task('default', ['css:common']);

gulp.watch([paths.source.all_css], ['css:common']);
