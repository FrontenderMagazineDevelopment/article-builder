import fs from 'fs';
import fetch from 'isomorphic-fetch';
import dotenv from 'dotenv';
import { resolve } from 'path';
import 'babel-polyfill';
import ArticleSDK from '@frontender-magazine/fm-article';
import ejs from 'ejs';

const removeMd = require('remove-markdown');
const url = require('url');
const hljs = require('highlight.js');
const rimraf = require('rimraf');
const MarkdownIt = require('markdown-it');
const jsdom = require('jsdom');
const Git = require('nodegit');

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

const ENV_PATH = resolve(__dirname, '../../.env');
const CONFIG_DIR = '../config/';
const CONFIG_PATH = resolve(
  __dirname,
  `${CONFIG_DIR}application.${process.env.NODE_ENV || 'local'}.json`,
);
if (!fs.existsSync(ENV_PATH)) throw new Error('Envirnment files not found');
dotenv.config({ path: ENV_PATH });

if (!fs.existsSync(CONFIG_PATH)) throw new Error(`Config not found: ${CONFIG_PATH}`);
const config = require(CONFIG_PATH); // eslint-disable-line

const articleSDK = new ArticleSDK(config.articleService);
const optionsGitHub = {
  headers: {
    Authorization: `token ${process.env.GITHUB_SECRET_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    userAgent: `UserCrowler/${process.env.VERSION}`,
  },
};

export default async (reponame, path = '../repos') => {
  const contributorsURL = `https://api.github.com/repos/FrontenderMagazine/${
    reponame
  }/contributors`;
  const repoPath = resolve(path, reponame);

  if (fs.existsSync(repoPath)) {
    rimraf.sync(repoPath);
  }
  await Git.Clone(`https://github.com/FrontenderMagazine/${reponame}.git`, repoPath);
  console.log('cloned to ', repoPath);

  const customStylesTrue = fs.existsSync(resolve(repoPath, 'styles.css'));

  let result;
  let json;
  try {
    result = await fetch(contributorsURL, optionsGitHub);
    if (!result.ok)
      throw new Error(`${contributorsURL} fail to load with ${result.status} ${result.statusText}`);
    json = await result.json();
  } catch (error) {
    console.log('errored: ', error.message); //eslint-disable-line
  }

  let contributorsList = json.map(async item => {
    let user = await fetch(item.url, optionsGitHub);
    if (!result.ok) throw new Error(`${item.url} fails to load`);
    user = await user.json();
    return {
      login: item.login,
      url: item.html_url,
      name: user.name,
      blog: user.blog,
    };
  });

  contributorsList = await Promise.all(contributorsList);

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
  try {
    article = await articleSDK.getByReponame(reponame);
    article = article[0];
    translation = article.translations.filter(item => {
      return item.domain === 'frontender.info';
    });
    translation = translation[0];
  } catch (error) {
    console.log(error); // eslint-disable-line
  }

  const authors = article.author;
  const translators = translation.author;

  const tag1 = Array.isArray(article.tags) && article.tags.length > 0 ? article.tags : [];
  const tag2 =
    Array.isArray(translation.tags) && translation.tags.length > 0 ? translation.tags : [];
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
        return item.login === url.parse(author.github).pathname.slice(1);
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
      data.user.twitterLabel = url.parse(author.twitter).pathname;
    }
    if (author.github) {
      data.user.github = author.github;
      data.user.githubLabel = url.parse(author.github).pathname;
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
      data.user.twitterLabel = url.parse(author.twitter).pathname;
    }
    if (author.github) {
      data.user.github = author.github;
      data.user.githubLabel = url.parse(author.github).pathname;
    }
    return ejs.render(personTemplate, data);
  });

  const page = ejs.render(articleTemplate, {
    translation,
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
