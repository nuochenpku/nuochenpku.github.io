const RECENT_PUBLICATION_LIMIT = 8;
const CURRENT_AUTHOR = 'nuo chen';
const LINK_LABELS = {
  pdf: 'PDF',
  paper: 'Paper',
  code: 'Code',
  project: 'Project',
  dataset: 'Dataset',
  demo: 'Demo',
  poster: 'Poster',
  zhihu: 'Zhihu',
  scholar: 'Google Scholar'
};

let allPublications = [];
let activePublicationView = 'recent';
let modalTrigger = null;

document.addEventListener('DOMContentLoaded', () => {
  initializeSections();
  initializePublicationViews();
  initializeNews();
  initializeModal();
  document.getElementById('current-year').textContent = new Date().getFullYear();
  loadPublications();
});

function initializeSections() {
  document.querySelectorAll('section').forEach((section, index) => {
    section.style.animationDelay = `${index * 0.08}s`;
  });
}

function initializePublicationViews() {
  document.querySelectorAll('[data-publication-view]').forEach(button => {
    button.addEventListener('click', () => {
      activePublicationView = button.dataset.publicationView;
      renderPublications();
    });
  });
}

function initializeNews() {
  const newsContainer = document.getElementById('news-container');
  const toggle = document.getElementById('toggle-news');
  const newsItems = newsContainer.querySelectorAll('.news-list li');

  if (newsItems.length <= 7) {
    return;
  }

  newsContainer.classList.add('collapsed');
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    const isCollapsed = newsContainer.classList.toggle('collapsed');
    toggle.setAttribute('aria-expanded', String(!isCollapsed));
    toggle.textContent = isCollapsed ? 'Show Earlier News' : 'Show Less';
  });
}

function initializeModal() {
  const modal = document.getElementById('imageModal');
  document.getElementById('modal-close').addEventListener('click', closeModal);
  modal.addEventListener('click', event => {
    if (event.target === modal) {
      closeModal();
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !modal.hidden) {
      closeModal();
    }
  });
}

async function loadPublications() {
  const container = document.getElementById('publications-container');
  try {
    const response = await fetch('publications.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    allPublications = sortPublications(Array.isArray(data.publications) ? data.publications : []);
    renderPublications();
  } catch (error) {
    console.error('Error loading publications:', error);
    container.removeAttribute('aria-busy');
    container.replaceChildren(createMessage('Publications could not be loaded. Please try again later.'));
    document.getElementById('publication-status').textContent = 'Publications could not be loaded.';
  }
}

function publicationYear(publication) {
  if (Number.isInteger(publication.year)) {
    return publication.year;
  }

  const venueYears = String(publication.venue || '').match(/\b(?:19|20)\d{2}\b/g);
  if (venueYears) {
    return Math.max(...venueYears.map(Number));
  }

  const arxivLink = Object.values(publication.links || {}).find(value =>
    /arxiv\.org\/(?:abs|pdf)\/(\d{2})\d{2}\./i.test(String(value))
  );
  if (arxivLink) {
    const match = String(arxivLink).match(/arxiv\.org\/(?:abs|pdf)\/(\d{2})\d{2}\./i);
    return 2000 + Number(match[1]);
  }

  return 0;
}

function sortPublications(publications) {
  return publications
    .map((publication, originalIndex) => ({ publication, originalIndex }))
    .sort((left, right) =>
      publicationYear(right.publication) - publicationYear(left.publication) ||
      left.originalIndex - right.originalIndex
    )
    .map(item => item.publication);
}

function publicationsForView(view) {
  if (view === 'selected') {
    return allPublications.filter(publication => publication.selected === 1);
  }
  if (view === 'all') {
    return allPublications;
  }
  return allPublications.slice(0, RECENT_PUBLICATION_LIMIT);
}

function renderPublications() {
  const container = document.getElementById('publications-container');
  const publications = publicationsForView(activePublicationView);
  const fragment = document.createDocumentFragment();
  let previousYear = null;

  document.querySelectorAll('[data-publication-view]').forEach(button => {
    button.setAttribute(
      'aria-pressed',
      String(button.dataset.publicationView === activePublicationView)
    );
  });

  publications.forEach(publication => {
    const year = publicationYear(publication);
    if (activePublicationView === 'all' && year !== previousYear) {
      const yearHeading = document.createElement('h3');
      yearHeading.className = 'publication-year-heading';
      yearHeading.textContent = year || 'Earlier';
      fragment.appendChild(yearHeading);
      previousYear = year;
    }
    fragment.appendChild(
      createPublicationElement(publication, activePublicationView === 'selected')
    );
  });

  if (!publications.length) {
    fragment.appendChild(createMessage('No publications are available in this view.'));
  }

  container.replaceChildren(fragment);
  container.removeAttribute('aria-busy');
  const viewLabel = activePublicationView === 'all' ? 'all' : activePublicationView;
  document.getElementById('publication-status').textContent =
    `Showing ${publications.length} ${viewLabel} publication${publications.length === 1 ? '' : 's'}.`;
}

function createMessage(text) {
  const message = document.createElement('p');
  message.className = 'status-message';
  message.textContent = text;
  return message;
}

function normalizedAuthorName(name) {
  return String(name).replace(/\*/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('en');
}

function createPublicationElement(publication, showThumbnail) {
  const article = document.createElement('article');
  article.className = showThumbnail ? 'publication-item publication-highlight' : 'publication-item publication-compact';

  if (showThumbnail && publication.thumbnail) {
    article.classList.add('has-thumbnail');
    const thumbnail = document.createElement('button');
    thumbnail.className = 'pub-thumbnail';
    thumbnail.type = 'button';
    thumbnail.setAttribute('aria-label', `View image for ${publication.title}`);
    thumbnail.addEventListener('click', () => openModal(publication, thumbnail));

    const image = document.createElement('img');
    image.src = publication.thumbnail;
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.width = 400;
    image.height = 220;
    thumbnail.appendChild(image);
    article.appendChild(thumbnail);
  }

  const content = document.createElement('div');
  content.className = 'pub-content';

  const title = document.createElement('h3');
  title.className = 'pub-title';
  title.textContent = publication.title;
  content.appendChild(title);

  const authors = document.createElement('div');
  authors.className = 'pub-authors';
  (publication.authors || []).forEach((author, index, authorList) => {
    const authorElement = document.createElement('span');
    authorElement.textContent = author;
    if (normalizedAuthorName(author) === CURRENT_AUTHOR) {
      authorElement.className = 'highlight-name';
    }
    authors.appendChild(authorElement);
    if (index < authorList.length - 1) {
      authors.appendChild(document.createTextNode(', '));
    }
  });
  content.appendChild(authors);

  const venueContainer = document.createElement('div');
  venueContainer.className = 'pub-venue-container';
  const venue = document.createElement('div');
  venue.className = 'pub-venue';
  venue.textContent = publication.venue || String(publicationYear(publication) || '');
  venueContainer.appendChild(venue);

  if (publication.award) {
    const award = document.createElement('span');
    award.className = 'pub-award';
    award.textContent = publication.award;
    venueContainer.appendChild(award);
  }
  content.appendChild(venueContainer);

  const links = createPublicationLinks(publication);
  if (links.childElementCount) {
    content.appendChild(links);
  }

  article.appendChild(content);
  return article;
}

function createPublicationLinks(publication) {
  const container = document.createElement('div');
  container.className = 'pub-links';
  Object.entries(LINK_LABELS).forEach(([type, label]) => {
    const url = publication.links && publication.links[type];
    if (!url) {
      return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.textContent = `[${label}]`;
    link.setAttribute('aria-label', `${label} for ${publication.title}`);
    container.appendChild(link);
  });
  return container;
}

function openModal(publication, trigger) {
  const modal = document.getElementById('imageModal');
  const image = document.getElementById('modalImage');
  modalTrigger = trigger;
  image.src = publication.thumbnail;
  image.alt = `Preview for ${publication.title}`;
  modal.hidden = false;
  document.body.classList.add('modal-open');
  setPageContentInert(true);
  document.getElementById('modal-close').focus();
}

function closeModal() {
  const modal = document.getElementById('imageModal');
  if (modal.hidden) {
    return;
  }
  modal.hidden = true;
  document.body.classList.remove('modal-open');
  setPageContentInert(false);
  document.getElementById('modalImage').removeAttribute('src');
  if (modalTrigger) {
    modalTrigger.focus();
    modalTrigger = null;
  }
}

function setPageContentInert(isInert) {
  document.querySelectorAll('body > :not(#imageModal)').forEach(element => {
    element.inert = isInert;
  });
}
