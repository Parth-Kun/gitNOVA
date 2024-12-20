// utils.js

const sessionCache = {};

function getSessionCache(){
    return sessionCache;
}

function clearSessionCache(){
    for (let key in sessionCache) {
        delete sessionCache[key];
    }
}

// Function to update URL params
function updateURLParams(params) {
  const url = new URL(window.location.href);

  // Clear all existing search parameters
  url.search = '';

  // Add only the specified parameters
  for (const key in params) {
    if (params[key]) {
      url.searchParams.set(key, params[key]);
    }
  }

  // Update the URL without reloading the page
  window.history.pushState({}, '', url);
  // Custom event for URL change (optional)
  window.dispatchEvent(new CustomEvent('urlchanged'));
}

// Function to initialize from URL params
function initFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const subject = urlParams.get('subject') || '';
  const chapter = urlParams.get('chapter') || '';
  const topic = urlParams.get('topic') || '';
  const questionNumber = parseInt(urlParams.get('question-number')) || 1;

    // Return all extracted params
    return {
        subject: subject,
        chapter: chapter,
        topic: topic,
        questionNumber: questionNumber
    }
}

// Function to save data in session storage
function saveSessionStorageData(subject,chapter,topic,questionProgress) {
    const key = `${subject}-${chapter}-${topic}`;
    const data = JSON.stringify(questionProgress);
    sessionStorage.setItem(key, data);
}

// Function to get data from session storage
function getSessionStorageData(subject,chapter,topic) {
    const key = `${subject}-${chapter}-${topic}`;
    const data = sessionStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

export { updateURLParams, initFromURL, saveSessionStorageData, getSessionStorageData, sessionCache, getSessionCache, clearSessionCache };