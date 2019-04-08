import fs from 'fs';
import dotenv from 'dotenv';
import { resolve } from 'path';
import ArticleSDK from '@frontender-magazine/fm-article';
import ejs from 'ejs';
import Octokit from '@octokit/rest';

const AdmZip = require('adm-zip');
const removeMd = require('remove-markdown');
const urlPack = require('url');
const hljs = require('highlight.js');
const rimraf = require('rimraf');
const MarkdownIt = require('markdown-it');
const jsdom = require('jsdom');

const { JSDOM } = jsdom;
const markdown = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

const personTemplate = fs.readFileSync(resolve(__dirname, '../components/Person/Person.ejs'), {
  encoding: 'utf-8',
});
const articleTemplate = fs.readFileSync(resolve(__dirname, '../components/Article/Article.ejs'), {
  encoding: 'utf-8',
});
const contributorTemplate = fs.readFileSync(
  resolve(__dirname, '../components/Contributor/Contributor.ejs'),
  { encoding: 'utf-8' },
);
const tagTemplate = fs.readFileSync(resolve(__dirname, '../components/Tag/Tag.ejs'), {
  encoding: 'utf-8',
});
const languages = [
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
hljs.configure({
  languages,
});

dotenv.config();

const { PROTOCOL, ARTICLE_SERVICE, GITHUB_TOKEN, ORG_NAME } = process.env;
const articleSDK = new ArticleSDK(`${PROTOCOL}${ARTICLE_SERVICE}`);

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
 */
const ArticleBuilder = async (reponame, path = '../repos') => {
  const octokit = Octokit({
    auth: `token ${GITHUB_TOKEN}`,
  });

  const link = await octokit.repos.getArchiveLink({
    owner: ORG_NAME,
    repo: reponame,
    archive_format: 'zipball',
    ref: 'master',
  });

  const dirname = link.headers['content-disposition']
    .replace('attachment; filename=', '')
    .replace('.zip', '');
  const repoPath = resolve(path, reponame);
  const zip = new AdmZip(link.data);
  zip.extractAllTo(path, true);
  if (fs.existsSync(repoPath)) {
    rimraf.sync(repoPath);
  }
  fs.renameSync(resolve(path, dirname), repoPath);
  const customCSSPath = resolve(repoPath, 'styles.css');
  const customStylesTrue = fs.existsSync(customCSSPath);
  const result = await octokit.repos.listContributors({
    owner: ORG_NAME,
    repo: reponame,
    anon: true,
    per_page: 100,
    page: 1,
  });

  let contributorsList = result.data
    .sort(({ contributions: contributionsA }, { contributions: contributionsB }) => {
      return contributionsA - contributionsB;
    })
    .map(({ login, html_url: url, name, blog }) => {
      return {
        login,
        url,
        name,
        blog,
      };
    });

  const md = fs.readFileSync(resolve(repoPath, 'rus.md'), { encoding: 'utf-8' });
  const descriptionMd = fs.readFileSync(resolve(repoPath, 'README.md'), { encoding: 'utf-8' });
  const html = markdown.render(md, {
    quotes: '«»„“',
  });
  const description = removeMd(markdown.render(descriptionMd), {
    stripListLeaders: true,
    gfm: true,
  });
  const dom = new JSDOM(html);
  const elements = dom.window.document.querySelectorAll('pre > code');
  elements.forEach(element => {
    hljs.highlightBlock(element);
  });

  let article;
  let translation;
  article = await articleSDK.getByReponame(reponame);
  // eslint-disable-next-line prefer-destructuring
  article = article[0];
  translation = article.translations.filter(item => item.domain === 'frontender.info');
  // eslint-disable-next-line prefer-destructuring
  translation = translation[0];
  const authors = article.author;
  const translators = translation ? translation.author : [];

  const tag1 = Array.isArray(article.tags) && article.tags.length > 0 ? article.tags : [];
  const tag2 =
    translation && Array.isArray(translation.tags) && translation.tags.length > 0
      ? translation.tags
      : [];
  const tags = tag1
    .concat(tag2)
    .map(tag => ejs.render(tagTemplate, { tag }).trim())
    .join(', ');

  contributorsList = contributorsList
    .filter(item => {
      const res = authors.filter(author => {
        if (author.github === undefined) {
          return author.name ? author.name === item.name : false;
        }
        return item.login === urlPack.parse(author.github).pathname.slice(1);
      });
      return res.length === 0;
    })
    .map(contributor => ejs.render(contributorTemplate, { contributor }).trim())
    .join(', ');

  const authorsList = authors.map(author => {
    const data = {
      user: {
        ...author,
        className: 'FM__person',
        type: 'author',
      },
    };
    if (author.twitter) {
      data.user.twitter = author.twitter;
      data.user.twitterLabel = urlPack.parse(author.twitter).pathname;
    }
    if (author.github) {
      data.user.github = author.github;
      data.user.githubLabel = urlPack.parse(author.github).pathname;
    }
    return ejs.render(personTemplate, data);
  });

  const translatorsList = translators.map(author => {
    const data = {
      user: {
        ...author,
        className: 'FM__person',
        type: 'translator',
      },
    };
    if (author.twitter) {
      data.user.twitter = author.twitter;
      data.user.twitterLabel = urlPack.parse(author.twitter).pathname;
    }
    if (author.github) {
      data.user.github = author.github;
      data.user.githubLabel = urlPack.parse(author.github).pathname;
    }
    return ejs.render(personTemplate, data);
  });

  const page = ejs.render(articleTemplate, {
    translation: translation || article,
    customStylesTrue,
    original: article,
    tags,
    content: dom.window.document.body.innerHTML,
    contributors: contributorsList,
    description,
    authors: authorsList.join('').concat(translatorsList.join('')),
  });

  fs.writeFileSync(resolve(repoPath, 'index.html'), page);
};

export default ArticleBuilder;
