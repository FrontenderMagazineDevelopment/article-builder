import mongoose from 'mongoose';

const ArticleSchema = new mongoose.Schema({
  url: { type: String, required: true, trim: true, lowercase: true }, // article current url
  domain: { type: String, required: true, text: true, trim: true, lowercase: true }, // domain from the url
  title: { type: String, required: true, text: true, trim: true }, // title of article
  lang: { type: String, required: true, trim: true }, // iso code of the language
  published: { type: Date, required: true },

  characters: { type: Number }, // characters count for billing

  author: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'users',
    },
  ], // Author of article or translation
  contributors: { type: Array }, // Editors, independent contributors from github

  tags: { type: Array }, // list of tags

  reponame: { type: String }, // if this is our translation — it have repo
  translations: { type: Array }, // array of thanslations in same format

  // @todo comments
  // @todo votes
});

const Article = mongoose.model('articles', ArticleSchema);
export default Article;
