/** @param {any[]} list */
const randomPick = (() => {
  let prev = 0;


  return (list) => {
    let curr = Math.floor(Math.random() * 999) % list.length;
    while (prev === curr) {
      curr = Math.floor(Math.random() * 999) % list.length;
    }
    prev = curr;
    return list[curr];
  };
})();

/** @param {HTMLElement} el */
const removeChildren = (el) => {
  while (el.firstChild) {
    el.firstChild.remove();
  }
};

/** @param {HTMLElement} el */
const renderOpenTag = (el) => {
  const validAttributes = Array.from(el.attributes);

  const tag = el.tagName.toLowerCase();
  if (validAttributes.length === 0) {
    return `<${tag}>`;
  }

  const attrs = validAttributes
    .map(({ name, textContent }) => `${name}="${textContent}"`)
    .join(' ')
    .trim();

  return `<${tag} ${attrs}>`;
};

/**
 * @param {HTMLElement} foldableParentEl
 * @param {HTMLElement} refEl
 **/
const renderFoldableDOM = (foldableParentEl, refEl) => {
  if (refEl.childElementCount === 0) {
    const leafEl = document.createElement('span');
    leafEl.classList.add('tag', 'leaf-tag');
    foldableParentEl.appendChild(leafEl);
    leafEl.textContent = `${renderOpenTag(refEl)}</${refEl.localName}>`;

    leafEl.queryRef = refEl;
    refEl.leafTagRef = leafEl;
    return foldableParentEl;
  }

  const foldableEl = document.createElement('details');
  foldableEl.open = true;
  foldableEl.queryRef = refEl;
  refEl.detailsRef = foldableEl;
  foldableParentEl.appendChild(foldableEl);

  const openTagEl = document.createElement('summary');
  openTagEl.textContent = renderOpenTag(refEl);
  openTagEl.classList.add('tag', 'open-tag');
  openTagEl.queryRef = refEl;
  refEl.openTagRef = openTagEl;
  foldableEl.appendChild(openTagEl);

  for (const refChildEl of refEl.children) {
    foldableParentEl.appendChild(renderFoldableDOM(foldableEl, refChildEl));
  }

  const closeTagEl = document.createElement('span');
  closeTagEl.classList.add('tag', 'close-tag');
  closeTagEl.textContent = `</${refEl.localName}>`;
  closeTagEl.queryRef = refEl;
  refEl.closeTagRef = closeTagEl;
  foldableEl.appendChild(closeTagEl);

  return foldableParentEl;
};

/** @param {string} html */
const buildFoldableDOM = (html) => {
  const queryRootEl = document.createElement('query-root');
  queryRootEl.innerHTML = html;
  const foldableRootEl = document.createElement('div');
  foldableRootEl.classList.add('foldable-root');
  const renderedFoldableRootEl = renderFoldableDOM(foldableRootEl, queryRootEl);

  queryRootEl.displayRef = renderedFoldableRootEl;
  queryRootEl.openTagRef.hidden = true;
  queryRootEl.closeTagRef.hidden = true;
  queryRootEl.detailsRef.open = true;

  return queryRootEl;
};

/** @param {HTMLElement} foldableDOM */
const expandAllDOM = (foldableDOM) => {
  for (const foldableEl of Array.from(foldableDOM.querySelectorAll('*'))) {
    if (foldableEl.detailsRef) {
      foldableEl.detailsRef.open = true;
    }
  }
};

/**
 * @param {HTMLElement} foldableDOM
 * @param {string} query
 **/
const collapseUselessDOM = (foldableDOM, query) => {
  expandAllDOM(foldableDOM);
  for (const foldableEl of Array.from(foldableDOM.querySelectorAll('*'))) {
    if (!foldableEl.querySelector(query) && foldableEl.detailsRef) {
      foldableEl.detailsRef.open = false;
    }
  }
};

/**
 * @param {HTMLElement} foldableDOM
 * @param {string} query
 * @param {string} [matchingStyle] default: 'color: blueviolet;font-weight: bold;'
 **/
const applyQueryToFoldableDOM = (foldableDOM, query, matchingStyle = 'color: blueviolet;font-weight: bold;') => {
  try {
    for (const foldableEl of Array.from(foldableDOM.querySelectorAll('*'))) {
      const displayEls = [
        foldableEl.openTagRef,
        foldableEl.closeTagRef,
        foldableEl.leafTagRef,
      ].filter(Boolean);
      for (const displayEl of displayEls) {
        displayEl.style = foldableEl.matches(query) ? matchingStyle : 'color: dimgray;';
      }
    }
  } catch (error) {
    if (error instanceof DOMException) {
      expandAllDOM(foldableDOM);
      applyQueryToFoldableDOM(foldableDOM, '*', 'color: dimgray;');
    } else {
      throw error;
    }
  }
};

/**
 * @param {HTMLElement} reactiveFoldableDOM
 * @param {string} userInput
 * @param {string} query
 **/
const validateUserInput = (reactiveFoldableDOM, userInput, query) => {
  let ok = true;
  collapseUselessDOM(reactiveFoldableDOM, String([userInput, query]));
  for (const foldableEl of Array.from(reactiveFoldableDOM.querySelectorAll('*'))) {
    const displayEls = [
      foldableEl.openTagRef,
      foldableEl.closeTagRef,
      foldableEl.leafTagRef,
    ].filter(Boolean);
    try {
      const isCorrect = foldableEl.matches(query) === foldableEl.matches(userInput);
      const isMatched = foldableEl.matches(query);

      for (const displayEl of displayEls) {
        if (isCorrect) {
          displayEl.style = isMatched ? 'color: green;font-weight: bold;' : 'color: dimgray;';
        } else {
          displayEl.style = 'color: red;font-weight: bold;';
          ok = false;
        }
      }
    } catch (error) {
      if (error instanceof DOMException) {
        // ignore
      } else {
        throw error;
      }
    }
  }
  return ok;
};

/**
 * @param {string} query
 * @param {string} html
 **/
const createNewQuestion = (query, html) => {
  const reactiveEl = document.getElementById('reactive');
  const questionEl = document.getElementById('question');
  const reactiveFoldableDOM = buildFoldableDOM(html);
  const questionFoldableDOM = buildFoldableDOM(html);

  removeChildren(questionEl);
  questionEl.appendChild(questionFoldableDOM.displayRef);
  applyQueryToFoldableDOM(questionFoldableDOM, query);
  collapseUselessDOM(questionFoldableDOM, query);

  removeChildren(reactiveEl);
  reactiveEl.appendChild(reactiveFoldableDOM.displayRef);

  let lastUserInput = '';
  applyQueryToFoldableDOM(reactiveFoldableDOM, lastUserInput, 'color: blue;font-weight: bold;');

  const inputEl = document.getElementById('user-input');
  inputEl.oninput = (e) => {
    lastUserInput = e.target.value;
    applyQueryToFoldableDOM(reactiveFoldableDOM, lastUserInput, 'color: blue;font-weight: bold;');
  };

  const collapseButtonEl = document.getElementById('collapse-btn');
  collapseButtonEl.onclick = () => {
    collapseUselessDOM(reactiveFoldableDOM, lastUserInput);
  };

  const answerButtonEl = document.getElementById('answer-btn');
  const answerDialogEl = document.getElementById('answer-dialog');
  answerButtonEl.onclick = () => {
    answerDialogEl.showModal();

    const answerEl = document.getElementById('answer');
    if(!lastUserInput) {
      return answerEl.innerHTML = '<h2>不要直接看答案，壞壞！</h2>';
    }
    const isOk = validateUserInput(reactiveFoldableDOM, lastUserInput, query);
    answerEl.innerHTML = `參考答案是：<code>${query}</code>。${isOk && (lastUserInput !== query) ? '但你的寫法也可以！' : ''}`;
  };
};

const HTML = `
<ul class="fish egg">
  <li class="dog">
    <a href="/flandre/css-practice"
      class="apple banana cat">
      <span>Code</span>
      <span id="code-count" class="goose"></span>
      <ul>
        <li class="dog"><span class="house">Code</span></li>
        <li class="dog"><span><span>Code</span></span></li>
        <li class="dog house"><span>Code</span></li>
      </ul>
    </a>
  </li>
  <li class="dog">
    <a href="/flandre/css-practice/issues"
      class="apple banana cat selected"
      aria-current="page">
      <span>Issues</span>
      <span id="issues-count" class="goose">10</span>
    </a>
  </li>
  <li class="dog">
    <a href="/flandre/css-practice/pulls"
      class="apple banana cat">
      <span style="background-color: blue;">Pull requests</span>
      <span class="goose" hidden="hidden">0</span>
    </a>
  </li>
  <li class="dog">
    <a href="/flandre/css-practice/actions"
      class="apple banana cat">
      <span>Actions</span>
      <span id="actions-count" class="goose house"></span>
    </a>
  </li>
  <li class="dog">
    <a href="/flandre/css-practice/wiki"
      class="apple banana cat"
      style="color: blue;">
      <span id="wiki-count" class="goose"></span>
    </a>
  </li>
  <li>
    <a href="/flandre/css-practice/security">
      <span></span>
      <span><span></span></span>
    </a>
  </li>
  <li class="dog">
    <a id="insights-tab" href="/flandre/css-practice/pulse"
      class="apple banana cat">
      <span>Insights</span>
      <span class="goose"></span>
    </a>
  </li>
  <li class="dog">
    <a href="/flandre/css-practice/settings"
      class="apple banana cat"
      style="visibility: hidden;">
      <span>Settings</span>
      <span class="goose"></span>
    </a>
  </li>
</ul>
`;
const generateButtonEl = document.getElementById('generate-btn');
generateButtonEl.onclick = () => {
  document.getElementById('user-input').value = '';
  createNewQuestion(randomPick([
    '#issues-count',
    '[style*="blue"]',
    '#insights-tab > span:first-child',
    '.house',
    'ul > li:nth-child(3)',
    '[style]',
    'span > span',
    'ul ul li',
    'li:nth-child(1) ~ li',
    '.dog + .dog',
    '.dog.house',
  ]), HTML);
};
generateButtonEl.click();
