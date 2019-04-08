'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');
Object.defineProperty(exports, '__esModule', { value: true });
exports['default'] = void 0;
var _regenerator = _interopRequireDefault(require('@babel/runtime/regenerator'));
var _objectSpread2 = _interopRequireDefault(require('@babel/runtime/helpers/objectSpread'));
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));
var _fs = _interopRequireDefault(require('fs'));
var _dotenv = _interopRequireDefault(require('dotenv'));
var _path = require('path');
var _fmArticle = _interopRequireDefault(require('@frontender-magazine/fm-article'));
var _ejs = _interopRequireDefault(require('ejs'));
var _rest = _interopRequireDefault(require('@octokit/rest'));
var AdmZip = require('adm-zip');
var removeMd = require('remove-markdown');
var urlPack = require('url');
var hljs = require('highlight.js');
var rimraf = require('rimraf');
var MarkdownIt = require('markdown-it');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;
var markdown = new MarkdownIt({ html: true, linkify: true, typographer: true });
var personTemplate = _fs['default'].readFileSync(
  (0, _path.resolve)(__dirname, '../components/Person/Person.ejs'),
  { encoding: 'utf-8' },
);
var articleTemplate = _fs['default'].readFileSync(
  (0, _path.resolve)(__dirname, '../components/Article/Article.ejs'),
  { encoding: 'utf-8' },
);
var contributorTemplate = _fs['default'].readFileSync(
  (0, _path.resolve)(__dirname, '../components/Contributor/Contributor.ejs'),
  { encoding: 'utf-8' },
);
var tagTemplate = _fs['default'].readFileSync(
  (0, _path.resolve)(__dirname, '../components/Tag/Tag.ejs'),
  { encoding: 'utf-8' },
);
var languages = [
  'HTML',
  'HTMLBars',
  'Haml',
  'Nginx',
  'XML',
  'JavaScript',
  'JSON',
  'Markdown',
  'Bash',
  'TypeScript',
  'Stylus',
  'CSS',
  'HTTP',
  'Less',
  'SCSS',
  'YAML',
];
hljs.configure({ languages: languages });
_dotenv['default'].config();
var _process$env = process.env,
  PROTOCOL = _process$env.PROTOCOL,
  ARTICLE_SERVICE = _process$env.ARTICLE_SERVICE,
  GITHUB_TOKEN = _process$env.GITHUB_TOKEN,
  ORG_NAME = _process$env.ORG_NAME;
var articleSDK = new _fmArticle['default'](''.concat(PROTOCOL).concat(ARTICLE_SERVICE));
/**
 * Transform repo to html article
 * @example
 *  (async function(){
 *    await builder(
 *      'the-art-of-html-semantics-pt1',
 *      '../websites/articles/'
 *    );
 *  })();
 * @namespace ArticleBuilder
 * @param {string} reponame - repository name
 * @param {string} path  - path where article will be created
 * @throw {Error}
 */ var ArticleBuilder = /*#__PURE__*/ (function() {
  var _ref = (0, _asyncToGenerator2['default'])(
    /*#__PURE__*/ _regenerator['default'].mark(function _callee(reponame) {
      var path,
        octokit,
        link,
        dirname,
        repoPath,
        zip,
        customCSSPath,
        customStylesTrue,
        result,
        contributorsList,
        md,
        descriptionMd,
        html,
        description,
        dom,
        elements,
        article,
        translation,
        authors,
        translators,
        tag1,
        tag2,
        tags,
        authorsList,
        translatorsList,
        page,
        _args = arguments;
      return _regenerator['default'].wrap(function _callee$(_context) {
        while (1) {
          switch ((_context.prev = _context.next)) {
            case 0:
              path = _args.length > 1 && _args[1] !== undefined ? _args[1] : '../repos';
              octokit = (0, _rest['default'])({ auth: 'token '.concat(GITHUB_TOKEN) });
              _context.next = 4;
              return octokit.repos.getArchiveLink({
                owner: ORG_NAME,
                repo: reponame,
                archive_format: 'zipball',
                ref: 'master',
              });
            case 4:
              link = _context.sent;
              dirname = link.headers['content-disposition']
                .replace('attachment; filename=', '')
                .replace('.zip', '');
              repoPath = (0, _path.resolve)(path, reponame);
              zip = new AdmZip(link.data);
              zip.extractAllTo(path, true);
              if (_fs['default'].existsSync(repoPath)) {
                rimraf.sync(repoPath);
              }
              _fs['default'].renameSync((0, _path.resolve)(path, dirname), repoPath);
              customCSSPath = (0, _path.resolve)(repoPath, 'styles.css');
              customStylesTrue = _fs['default'].existsSync(customCSSPath);
              _context.next = 15;
              return octokit.repos.listContributors({
                owner: ORG_NAME,
                repo: reponame,
                anon: true,
                per_page: 100,
                page: 1,
              });
            case 15:
              result = _context.sent;
              contributorsList = result.data
                .sort(function(_ref2, _ref3) {
                  var contributionsA = _ref2.contributions;
                  var contributionsB = _ref3.contributions;
                  return contributionsA - contributionsB;
                })
                .map(function(_ref4) {
                  var login = _ref4.login,
                    url = _ref4.html_url,
                    name = _ref4.name,
                    blog = _ref4.blog;
                  return { login: login, url: url, name: name, blog: blog };
                });
              md = _fs['default'].readFileSync((0, _path.resolve)(repoPath, 'rus.md'), {
                encoding: 'utf-8',
              });
              descriptionMd = _fs['default'].readFileSync(
                (0, _path.resolve)(repoPath, 'README.md'),
                { encoding: 'utf-8' },
              );
              html = markdown.render(md, { quotes: '\xAB\xBB\u201E\u201C' });
              description = removeMd(markdown.render(descriptionMd), {
                stripListLeaders: true,
                gfm: true,
              });
              dom = new JSDOM(html);
              elements = dom.window.document.querySelectorAll('pre > code');
              elements.forEach(function(element) {
                hljs.highlightBlock(element);
              });
              _context.next = 26;
              return articleSDK.getByReponame(reponame);
            case 26:
              article = _context.sent; // eslint-disable-next-line prefer-destructuring
              article = article[0];
              translation = article.translations.filter(function(item) {
                return item.domain === 'frontender.info';
              }); // eslint-disable-next-line prefer-destructuring
              translation = translation[0];
              authors = article.author;
              translators = translation ? translation.author : [];
              tag1 = Array.isArray(article.tags) && article.tags.length > 0 ? article.tags : [];
              tag2 =
                translation && Array.isArray(translation.tags) && translation.tags.length > 0
                  ? translation.tags
                  : [];
              tags = tag1
                .concat(tag2)
                .map(function(tag) {
                  return _ejs['default'].render(tagTemplate, { tag: tag }).trim();
                })
                .join(', ');
              contributorsList = contributorsList
                .filter(function(item) {
                  var res = authors.filter(function(author) {
                    if (author.github === undefined) {
                      return author.name ? author.name === item.name : false;
                    }
                    return item.login === urlPack.parse(author.github).pathname.slice(1);
                  });
                  return res.length === 0;
                })
                .map(function(contributor) {
                  return _ejs['default']
                    .render(contributorTemplate, { contributor: contributor })
                    .trim();
                })
                .join(', ');
              authorsList = authors.map(function(author) {
                var data = {
                  user: (0, _objectSpread2['default'])({}, author, {
                    className: 'FM__person',
                    type: 'author',
                  }),
                };
                if (author.twitter) {
                  data.user.twitter = author.twitter;
                  data.user.twitterLabel = urlPack.parse(author.twitter).pathname;
                }
                if (author.github) {
                  data.user.github = author.github;
                  data.user.githubLabel = urlPack.parse(author.github).pathname;
                }
                return _ejs['default'].render(personTemplate, data);
              });
              translatorsList = translators.map(function(author) {
                var data = {
                  user: (0, _objectSpread2['default'])({}, author, {
                    className: 'FM__person',
                    type: 'translator',
                  }),
                };
                if (author.twitter) {
                  data.user.twitter = author.twitter;
                  data.user.twitterLabel = urlPack.parse(author.twitter).pathname;
                }
                if (author.github) {
                  data.user.github = author.github;
                  data.user.githubLabel = urlPack.parse(author.github).pathname;
                }
                return _ejs['default'].render(personTemplate, data);
              });
              page = _ejs['default'].render(articleTemplate, {
                translation: translation || article,
                customStylesTrue: customStylesTrue,
                original: article,
                tags: tags,
                content: dom.window.document.body.innerHTML,
                contributors: contributorsList,
                description: description,
                authors: authorsList.join('').concat(translatorsList.join('')),
              });
              _fs['default'].writeFileSync((0, _path.resolve)(repoPath, 'index.html'), page);
            case 40:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee);
    }),
  );
  return function ArticleBuilder(_x) {
    return _ref.apply(this, arguments);
  };
})();
var _default = ArticleBuilder;
exports['default'] = _default;
//# sourceMappingURL=index.js.map
