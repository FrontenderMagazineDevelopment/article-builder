import 'babel-polyfill';
import build from './index';
import fs from 'fs';
import dotenv from 'dotenv';
import { resolve } from 'path';
import mongoose from 'mongoose';
import Article from './models/Article';
import Event from './models/Event';

const ENV_PATH = resolve(__dirname, '../../.env');
const CONFIG_DIR = '../config/';
const CONFIG_PATH = resolve(
  __dirname,
  `${CONFIG_DIR}application.${process.env.NODE_ENV || 'local'}.json`,
);
console.log('path: ', CONFIG_PATH);
if (!fs.existsSync(ENV_PATH)) throw new Error('Envirnment files not found');
dotenv.config({ path: ENV_PATH });

if (!fs.existsSync(CONFIG_PATH)) throw new Error(`Config not found: ${CONFIG_PATH}`);
const config = require(CONFIG_PATH); // eslint-disable-line
const { name, version } = require('../package.json');

(async () => {
  console.log(config);
  console.log(CONFIG_PATH);
  console.log(ENV_PATH);
  console.log(`mongodb://${config.mongoDBHost}:${config.mongoDBPort}/${config.mongoDBName}`);
  mongoose.Promise = global.Promise;
  await mongoose.connect(
    `mongodb://${config.mongoDBHost}:${config.mongoDBPort}/${config.mongoDBName}`,
    { useMongoClient: true },
  );

  const published = await Event.find({ state: 'published' });

  console.warn(published);

  published.splice(1).forEach(async event => {
    const articleId = event.article_id;
    const query = [];

    query.push({
      $match: {
        _id: mongoose.Types.ObjectId(articleId),
      },
    });

    query.push({
      $unwind: {
        path: '$translations',
        preserveNullAndEmptyArrays: true,
      },
    });

    query.push({
      $lookup: {
        from: 'users',
        localField: 'author',
        foreignField: '_id',
        as: 'author',
      },
    });

    query.push({
      $lookup: {
        from: 'users',
        localField: 'translations.author',
        foreignField: '_id',
        as: 'translations.author',
      },
    });

    query.push({
      $group: {
        _id: '$_id',
        url: { $first: '$url' },
        domain: { $first: '$domain' },
        title: { $first: '$title' },
        published: { $first: '$published' },
        lang: { $first: '$lang' },
        tags: { $first: '$tags' },
        contributors: { $first: '$contributors' },
        author: { $first: '$author' },
        translations: { $push: '$translations' },
      },
    });

    let article = await Article.aggregate(query);
    article = article[0];
    const reponame =
      article.reponame !== undefined
        ? article.reponame
        : article.translations !== undefined
          ? article.translations.filter(item => {
              return item.domain === 'frontender.info';
            })[0].reponame
          : null;
    console.log(article.title, reponame);
    await build(reponame, '/websites/articles/');
    console.log(reponame, 'builded');
  });
})();
