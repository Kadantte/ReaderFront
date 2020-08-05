import packageJson from '../package.json';

export const NODE_ENV = process.env.NODE_ENV;
export const IS_PROD = process.env.NODE_ENV === 'production';
export const APP_URL = process.env.REACT_APP_APP_URL;
export const READER_PATH = process.env.REACT_APP_READER_PATH;
export const APP_PATH = process.env.REACT_APP_APP_PATH;
export const APP_TITLE = process.env.REACT_APP_APP_TITLE;
export const GA_ID = process.env.REACT_APP_GA_ID;
export const CDN = process.env.REACT_APP_CDNS;
export const LANGUAGES = process.env.REACT_APP_LANGUAGES
  ? process.env.REACT_APP_LANGUAGES.split(',')
  : ['en'];
export const APP_VERSION = packageJson.version;
export const S3_ENDPOINT = process.env.REACT_APP_S3_ENDPOINT;
