import { v1 as uuidv1 } from 'uuid';
import { Op } from 'sequelize';
import formatDate from 'date-fns/format';

// App Imports
import { includesField, hasPermission } from '../../setup/utils';
import { languageById } from '@shared/params/global';
import { isValidThumb } from '../../setup/images-helpers';
import { API_URL } from '../../config/env';
import models from '../../setup/models';
import { normalizeWork } from '../works/resolvers';

// Get all chapters
export async function getAll(
  _,
  {
    languages = [],
    orderBy = 'DESC',
    first = 10,
    offset = 0,
    showHidden = false
  }
) {
  const chapters = await models.Chapter.findAll({
    ...where(showHidden, languages),
    order: [
      ['releaseDate', orderBy],
      [models.Page, 'filename']
    ],
    include: [
      { model: models.Works, as: 'work' },
      { model: models.Page, as: 'pages' }
    ],
    offset: offset,
    limit: first
  }).map(el => el.get({ plain: true }));

  return chapters.map(chapter => normalizeChapter(chapter, chapter.work));
}

// Get chapter by work
export async function getByWork(
  _,
  { workStub, languages = [], showHidden },
  __,
  { fieldNodes = [] }
) {
  const order = [
    ['chapter', 'DESC'],
    ['subchapter', 'DESC']
  ];
  const includePages = includesField(fieldNodes, ['pages']);
  const pages = includePages
    ? {
        join: [
          {
            model: models.Page,
            as: 'pages'
          }
        ],
        order: { order: [...order, [models.Page, 'filename']] }
      }
    : {
        join: [],
        order: { order: order }
      };
  const chapters = await models.Chapter.findAll({
    ...where(showHidden, languages),
    include: [
      { model: models.Works, as: 'work', where: { stub: workStub } },
      ...pages.join
    ],
    order
  }).map(el => el.get({ plain: true }));

  return chapters.map(chapter => normalizeChapter(chapter, chapter.work));
}

// Get chapter by work id
export async function getByWorkId(_, { workId }) {
  const order = [
    ['chapter', 'DESC'],
    ['subchapter', 'DESC']
  ];
  const chapters = await models.Chapter.findAll({
    where: { workId },
    order
  }).map(el => el.get({ plain: true }));

  return chapters.map(chapter => normalizeChapter(chapter, chapter.work));
}

// Get chapter by id
export async function getById(parentValue, { id, showHidden }) {
  const where = showHidden
    ? { where: { id } }
    : { where: { hidden: false, id } };
  const chapter = await models.Chapter.findOne({
    ...where,
    include: [
      { model: models.Works, as: 'work' },
      { model: models.Page, as: 'pages' }
    ],
    order: [[models.Page, 'filename']]
  });

  return normalizeChapter(chapter.toJSON(), chapter.toJSON().work);
}

// Get chapter by work stub, chapter + subchapter + volume + language
export async function getWithPagesByWorkStubAndChapter(
  parentValue,
  { workStub, language, volume, chapter, subchapter, showHidden }
) {
  let where = { where: { chapter, subchapter, volume, language } };
  if (!showHidden) {
    where.where.hidden = false;
    where.where.releaseDate = { [Op.lt]: new Date() };
  }
  const chapterObj = await models.Chapter.findOne({
    ...where,
    include: [
      { model: models.Works, as: 'work', where: { stub: workStub } },
      { model: models.Page, as: 'pages' }
    ],
    order: [[models.Page, 'filename']]
  });

  return normalizeChapter(chapterObj.toJSON(), chapterObj.toJSON().work);
}

// Get all chapters for RSS
export async function getAllRSS({
  languages = [],
  orderBy = 'DESC',
  showHidden = false
}) {
  const chapters = await models.Chapter.findAll({
    ...where(showHidden, languages),
    order: [['releaseDate', orderBy]],
    include: [{ model: models.Works, as: 'work' }],
    offset: 0,
    limit: 25
  }).map(el => el.get({ plain: true }));

  return chapters.map(chapter => normalizeChapter(chapter, chapter.work));
}

// Create chapter
export async function create(
  parentValue,
  {
    workId,
    chapter,
    subchapter,
    volume,
    name,
    stub,
    uniqid,
    hidden,
    description,
    thumbnail,
    releaseDate
  },
  { auth }
) {
  if (hasPermission('create', auth)) {
    uniqid = uuidv1();
    if (releaseDate === null) {
      releaseDate = new Date();
    }

    const work = await models.Works.findOne({
      where: { id: workId },
      attributes: ['language']
    });

    return await models.Chapter.create({
      workId,
      chapter,
      subchapter,
      volume,
      language: work.language,
      name,
      stub,
      uniqid,
      hidden,
      description,
      thumbnail,
      releaseDate
    });
  } else {
    throw new Error('Operation denied.');
  }
}

// Update chapter
export async function update(
  parentValue,
  {
    id,
    workId,
    chapter,
    subchapter,
    volume,
    name,
    stub,
    uniqid,
    hidden,
    description,
    thumbnail,
    releaseDate
  },
  { auth }
) {
  if (hasPermission('update', auth)) {
    return await models.Chapter.update(
      {
        workId,
        chapter,
        subchapter,
        volume,
        name,
        stub,
        uniqid,
        hidden,
        description,
        thumbnail,
        releaseDate
      },
      { where: { id } }
    );
  } else {
    throw new Error('Operation denied.');
  }
}

// Update chapter
export async function updateDefaultThumbnail(
  parentValue,
  { id, thumbnail },
  { auth }
) {
  if (hasPermission('update', auth)) {
    return await models.Chapter.update(
      {
        thumbnail
      },
      { where: { id } }
    );
  } else {
    throw new Error('Operation denied.');
  }
}

// Delete chapter
export async function remove(parentValue, { id }, { auth }) {
  if (hasPermission('delete', auth)) {
    const chapter = await models.Chapter.findOne({ where: { id } });

    if (!chapter) {
      // Chapter does not exists
      throw new Error('The chapter does not exists.');
    } else {
      return await models.Chapter.destroy({ where: { id } });
    }
  } else {
    throw new Error('Operation denied.');
  }
}

export async function updateStatus(_, { id, hidden }, { auth }) {
  if (hasPermission('delete', auth)) {
    return await models.Chapter.update(
      {
        hidden
      },
      { where: { id } }
    );
  } else {
    throw new Error('Operation denied.');
  }
}

// Chapter types
export async function getTypes() {
  return {};
}

const where = (showHidden, languages) => {
  const isAllLanguage = languages.length === 0;
  if (showHidden && isAllLanguage) {
    return {};
  }

  const oLanguage = isAllLanguage ? {} : { language: { [Op.or]: languages } };
  const sHidden = showHidden
    ? {}
    : { hidden: false, releaseDate: { [Op.lt]: new Date() } };

  return { where: { ...sHidden, ...oLanguage } };
};

export const normalizeChapter = (chapter, work) => ({
  ...chapter,
  releaseDate_formatted: formatDate(
    new Date(chapter.releaseDate),
    'dd/MM/yyyy'
  ),
  download_href: `${API_URL}/download/${chapter.id}`,
  thumbnail_path:
    isValidThumb(chapter.thumbnail) && work
      ? `/works/${work.uniqid}/${chapter.uniqid}/${chapter.thumbnail}`
      : '/default-cover.png',
  language_name: languageById(chapter.language).name,
  read_path: work
    ? `/read/${work.stub}/${languageById(chapter.language).name}/${
        chapter.volume
      }/${chapter.chapter}.${chapter.subchapter}`
    : null,
  work: normalizeWork(chapter.work)
});
