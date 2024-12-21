// script.js
import {
  updateURLParams,
  initFromURL,
  savelocalStorageData,
  getlocalStorageData,
  sessionCache,
  clearSessionCache,
} from './utils.js';

// Constants
const API_BASE = 'https://qapi-xbw7.onrender.com/';
const SKELETON_COUNT = 9;

// DOM element cache
const $subjects = $('#subjects');
const $chapters = $('#chapters');
const $topics = $('#topics');
const $questionContent = $('#question-content');
const $timer = $('#timer');
const $score = $('#score');
const $questionListContainer = $('#question-list-container');
const $questionSidebar = $('#question-sidebar');
const $questionItem = $('#question-item');
const $answerOptions = $('#answer-options');
const $answerInputField = $('#answer-input-field');
const $submitAnswerButton = $('#submit-answer-button');
const $previousQuestionButton = $('#previous-question-button');
const $nextQuestionButton = $('#next-question-button');
const $resetQuizButton = $('#reset-quiz-button');
const $currentQuestionNumber = $('#current-question-number');
const $paperTitle = $('#paper-title');
const $explanation = $('#explanation');
const $totalQuestionsNumber = $('#total-questions-number');
const $subjectContainer = $('#subject-container');
const $chapterContainer = $('#chapter-container');
const $topicContainer = $('#topic-container');
const $questionContainer = $('#question-container');
const $breadcrumbSubj = $('#breadcrumb-subj');
const $breadcrumbChap = $('#breadcrumb-chap');
const $breadcrumbTopi = $('#breadcrumb-topi');
const $breadcrumbSubject = $('#breadcrumb-subject');
const $breadcrumbChapter = $('#breadcrumb-chapter');
const $breadcrumbTopic = $('#breadcrumb-topic');
const $darkModeToggle = $('#dark-mode-toggle');
const $html = $('html');
const $body = $('body');
const $breadcrumbHome = $('#breadcrumb-home');
const $backToSubjects = $('#back-to-subjects');
const $backToChapters = $('#back-to-chapters');
const $imageContainer = $('#image-container');
const $bookmarkButton = $('#bookmark-button');

// State variables
let subject = '';
let chapter = '';
let topic = '';
let questions = [];
let currentQuestionIndex = 0;
let timer = 0;
let timerInterval;
let questionProgress = [];
let isManualScroll = false;
let scrollTimeoutId = null;
let isDarkMode = localStorage.getItem('darkMode') === 'enabled';
let score = 0;
let bookmarkedQuestions = []; // Not used anymore

// Initialize from URL and session storage on page load
const urlData = initFromURL();

subject = urlData.subject;
chapter = urlData.chapter;
topic = urlData.topic;
currentQuestionIndex = Math.max(urlData.questionNumber - 1, 0);

setInitialTheme();
updateBreadcrumb();

// --- Utility Functions ---
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secondsRemaining = seconds % 60;
  let timeString = '';
  if (minutes > 0) {
    timeString += `${minutes}m `;
  }
  if (secondsRemaining > 0) {
    timeString += `${secondsRemaining}s`;
  }
  return timeString;
}

function renderMathJax() {
  MathJax.typesetPromise()
    .then(() => {
      console.log('MathJax rendering complete');
    })
    .catch(err => {
      console.error('MathJax rendering failed:', err);
    });
}

function renderContent(html) {
  return html;
}

function showSkeletons(element, skeletonClass, count) {
  element.html(
    Array(count)
      .fill(`<div class="skeleton ${skeletonClass}"></div>`)
      .join('')
  );
}

function showSubjectSkeletons() {
  showSkeletons($subjects, 'skeleton-subject', 3);
}

function showChapterSkeletons() {
  showSkeletons($chapters, 'skeleton-chapter', SKELETON_COUNT);
}

function showTopicSkeletons() {
  showSkeletons($topics, 'skeleton-topic', SKELETON_COUNT);
}

function showQuestionSkeletons() {
  $questionContent.html(`
    <div class="skeleton skeleton-question"></div>
    <div class="skeleton skeleton-option"></div>
    <div class="skeleton skeleton-option"></div>
    <div class="skeleton skeleton-option"></div>
    <div class="skeleton skeleton-option"></div>
  `);
}



// --- Timer Functions ---
function startTimer() {
  timer = 0;
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timer++;
    $timer.text(formatTime(timer));
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

// --- Fetch and Render Functions ---

// <!--From api we get 2 things URL of a (to send user to that link when he clicks it) and url of image. -->
function fetchAndRenderImage(){
  // fetch image from apibase image
  fetch( `${API_BASE}banner` , {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then(response => response.json())
    .then(data => {
      const imageUrl = data.url;
      const clickUrl = data.clickUrl;
      const imageContainer = document.getElementById('image-container');
      imageContainer.innerHTML = `<img id="image" class="shadow-md transition-transform duration-300 flex items-center justify-between cursor-pointer" src=${imageUrl} alt="Discord" onclick="window.open('${clickUrl}', '_blank')">`;
    })
    .catch(error => console.error('Error fetching image:', error));
}

function fetchAndRenderSubjects() {
  $subjectContainer.show();
  showSubjectSkeletons();
  $subjects.html('');

  const subjectsData = [
    {
      name: 'maths',
      icon: 'fas fa-calculator',
      chapters: 32,
      questions: 4515,
      color: 'blue',
    },
    {
      name: 'physics',
      icon: 'fas fa-rocket',
      chapters: 28,
      questions: 4507,
      color: 'orange',
    },
    {
      name: 'chemistry',
      icon: 'fas fa-flask',
      chapters: 31,
      questions: 4243,
      color: 'green',
    },
  ];

  subjectsData.forEach(sub => {
    $subjects.append(`
          <div class="subject-card bg-${sub.color}-200 text-gray-800 p-7 rounded-2xl shadow-md transition-transform duration-300 flex items-center justify-between cursor-pointer hover:scale-105" data-subject="${sub.name}">
            <div>
              <h4 class="text-xl font-bold mb-2 capitalize">${sub.name} <i class="fas fa-angle-right"></i></h4>
              <p class="text-sm">${sub.chapters} Chapters, ${sub.questions} Qs</p>
            </div>
            <div class="icon-container p-3 bg-${sub.color}-400 rounded-full">
              <i class="${sub.icon} text-white text-xl"></i>
            </div>
          </div>
        `);
  });
}

function fetchChapters() {
  $subjectContainer.hide();
  $chapterContainer.show();
  showChapterSkeletons();
  const cacheKey = `${subject}-chapters`;

  if (sessionCache[cacheKey]) {
    renderChapters(sessionCache[cacheKey]);
    return;
  }

  $.get(`${API_BASE}${subject}`, data => {
    sessionCache[cacheKey] = data;
    renderChapters(data);
  });
}

function renderChapters(data) {
  $chapters.html(''); // Clear the existing content

  data.chapters.forEach(ch => {
    $chapters.append(`
        <button class="btn chapter w-100 p-3 rounded-2xl shadow-sm transition-transform duration-300 hover:scale-105 dark:border-slate-700" data-chapter="${ch.name}">
          <div class="d-flex justify-content-center align-items-center">
            <p class="mb-0 font-weight-bold chapter-title font-bold capitalize chapter">${ch.name.replace(/-/g, ' ')}</p>
            <p class="mb-0 text-muted question-count text-[0.7rem]">${ch.questionCount} Qs</p>
          </div>
        </button>
    `);
  });
}

function fetchTopics() {
  $subjectContainer.hide();
  $chapterContainer.hide();
  $topicContainer.show();
  showTopicSkeletons();
  const cacheKey = `${subject}-${chapter}-topics`;

  if (sessionCache[cacheKey]) {
    renderTopics(sessionCache[cacheKey]);
    return;
  }
  $.get(`${API_BASE}${subject}/${chapter}`, data => {
    sessionCache[cacheKey] = data;
    renderTopics(data);
  });
}

function renderTopics(data) {
  $topics.html(''); // Clear the existing content (assuming $topics exists)

  data.topics.forEach(tp => {
    $topics.append(`
        <button class="btn topic w-100 p-3 rounded-2xl shadow-sm transition-transform duration-300 hover:scale-105 dark:border-slate-700" data-topic="${tp.name}">
          <div class="d-flex justify-content-center align-items-center">
            <p class="mb-0 font-weight-bold topic-title font-bold capitalize">${tp.name.replace(/-/g, ' ')}</p>
            <p class="mb-0 text-muted question-count text-[0.7rem]">${tp.questionCount} Qs</p>
          </div>
        </button>
    `);
  });
}

function fetchQuestions() {
  $subjectContainer.hide();
  $topicContainer.hide();
  $questionContainer.show();
  $questionSidebar.show();
  showQuestionSkeletons();
  const cacheKey = `${subject}-${chapter}-${topic}-questions`;

  if (sessionCache[cacheKey]) {
    questions = sessionCache[cacheKey];
    renderQuestions();
    return;
  }

  $.get(`${API_BASE}${subject}/${chapter}/${topic}`, data => {
    sessionCache[cacheKey] = data.questions.reverse();
    questions = sessionCache[cacheKey];
    renderQuestions();
  });
}

function renderQuestions() {
  showQuestionSkeletons();
  $subjectContainer.hide();
  initQuestionProgress();
  $totalQuestionsNumber.text(questions.length);
  $questionContainer.show();

  renderQuestion();
  $topicContainer.hide();
  $questionSidebar.show();
}

// --- Question Progress and Rendering ---
function initQuestionProgress() {
  score = 0;
  $score.text(score);
  questionProgress = questions.map((q, index) => ({
    index: index,
    answered: false,
    correct: null,
    type: q.type,
    userAnswer: null,
    viewed: false,
    bookmarked: false,
  }));

  const savedProgress = getlocalStorageData(subject, chapter, topic);
  if (savedProgress) {
    questionProgress = savedProgress;
    score = questionProgress.reduce((sum, q) => (q.correct ? sum + 1 : sum), 0);
    $score.text(score);
  }
  updateQuestionListUI();
}

function updateQuestionListUI() {
  const questionList = $(`
    <div id="question-list-container" class="flex flex-nowrap">
        ${questionProgress
        .map(
            q => `
             <div class="question-item btn font-bold dark:border-slate-700  capitalize ${q.answered
                ? q.correct
                    ? 'btn-success text-white'
                    : 'btn-error text-white'
                : q.viewed
                    ? 'btn-info text-white'
                    : 'border-black text'
                }" data-index="${q.index}">
                Q${q.index + 1}
                ${q.answered
                    ? q.correct
                        ? '<i class="fas fa-check"></i>'
                        : '<i class="fas fa-times"></i>'
                    : ''}
                ${
                    q.bookmarked
                        ? '<i class="fas fa-bookmark text-yellow-500"></i>'
                        : ''
                    }
              </div>
              `
            )
            .join('')}
        </div>
    `);

  questionList.on('click', '.question-item', function () {
    const targetIndex = $(this).data('index');
    currentQuestionIndex = targetIndex;
    updateURLParams({
      subject,
      chapter,
      topic,
      'question-number': currentQuestionIndex + 1,
    });
    renderQuestion();
  });

  $questionListContainer.remove();
  $questionSidebar.html(questionList);

  const container = $questionSidebar;
  container.on('scroll', function () {
    isManualScroll = true;
    clearTimeout(scrollTimeoutId);
    scrollTimeoutId = setTimeout(function () {
      isManualScroll = false;
    }, 500);
  });

  const currentQuestionItem = $(
    `.question-item[data-index="${currentQuestionIndex}"]`
  );
  const itemHeight = currentQuestionItem.outerHeight();
  const containerHeight = container.outerHeight();
  const itemTop = currentQuestionItem.position().top;
  const newScrollTop = itemTop - (containerHeight - itemHeight) / 2;

  container.on('scroll', function () {
    const currentScrollTop = container.scrollTop();
    const currentQuestionItem = $(
      `.question-item[data-index="${currentQuestionIndex}"]`
    );
    const itemTop = currentQuestionItem.position().top;
    const newScrollTop = itemTop - (containerHeight - itemHeight) / 2;
    if (Math.abs(currentScrollTop - newScrollTop) > 10) {
      // Additional logic can be added here if needed
    }
  });

  setTimeout(function () { }, 100);
}

function renderQuestion() {
  if (!questions.length) return;

  const currentQuestion = questions[currentQuestionIndex];
  const q = currentQuestion.question;
  $resetQuizButton.hide();

  $currentQuestionNumber.text(currentQuestionIndex + 1);
  $paperTitle.text(currentQuestion.paperTitle || '');

  $questionContent.html(renderContent(q.content));
  $submitAnswerButton.prop('disabled', false);
  $('.option').removeClass('disabled');
  $answerInputField.prop('disabled', false);

  if (currentQuestion.type === 'mcq') {
    const options = q.options
      .map(opt => {
        const renderedContent = renderContent(opt.content);
        return `
                <button class='btn font option dark:border-slate-700 hover:scale-[1.01] active:scale-[0.99]' data-identifier="${opt.identifier}">
                    ${renderedContent}
                </button>
            `;
      })
      .join('');
    $answerOptions.html(options);
    $answerInputField.hide();
    $answerOptions.show();
  } else if (currentQuestion.type === 'integer') {
    $answerOptions.hide();
    $answerInputField
      .show()
      .val('')
      .attr('type', 'number');
  }

  const userAnswer = questionProgress[currentQuestionIndex].userAnswer;
  if (userAnswer) {
    if (currentQuestion.type === 'mcq') {
      $(`.option[data-identifier="${userAnswer}"]`).addClass('selected');
    } else if (currentQuestion.type === 'integer') {
      $answerInputField.val(userAnswer);
    }
  }

  $('.option').removeClass('selected correct incorrect');
  $explanation.html('');
  $submitAnswerButton.show();

  $previousQuestionButton.prop('disabled', currentQuestionIndex === 0);
  $nextQuestionButton.prop(
    'disabled',
    currentQuestionIndex === questions.length - 1
  );

  $('.question-item').removeClass('active');
  const currentQuestionItem = $(
    `.question-item[data-index="${currentQuestionIndex}"]`
  );
  currentQuestionItem.addClass('active');

  const container = $questionSidebar;
  if (!isManualScroll) {
    const itemTop =
      currentQuestionItem.offset().top -
      container.offset().top +
      container.scrollTop();
    const itemHeight = currentQuestionItem.outerHeight();
    const containerHeight = container.outerHeight();
    const newScrollTop = itemTop - (containerHeight - itemHeight) / 2;
    container.stop().animate({ scrollTop: newScrollTop }, 500);
  }

  questionProgress[currentQuestionIndex].viewed = true;
  updateQuestionListUI();
  updateBookmarkButtonUI(questionProgress[currentQuestionIndex].bookmarked);

  startTimer();
  renderMathJax();
}

// --- Event Handlers ---
$submitAnswerButton.click(function () {
  stopTimer();
  $(this).prop('disabled', true);
  $('.option').addClass('disabled');
  $answerInputField.prop('disabled', true);

  const currentQuestion = questions[currentQuestionIndex];
  let isCorrect = false;

  const correctSound = new Audio('correct.mp3');
  const wrongSound = new Audio('wrong.mp3');

  if (currentQuestion.type === 'mcq') {
    const selected = $('.option.selected').data('identifier');
    const correctOptions = currentQuestion.question.correct_options;

    $('.option').each(function () {
      const optIdentifier = $(this).data('identifier');
      if (correctOptions.includes(optIdentifier)) {
        $(this).addClass('correct');
      }
    });

    isCorrect = correctOptions.includes(selected);
    if (isCorrect) {
      correctSound.play();
      $('.option.selected').addClass('correct');
      $explanation.html(`
                <div class="card card-success">
                    <i class="fas fa-check mr-2"></i>
                    <strong>Correct!</strong><br>
                    ${renderContent(currentQuestion.question.explanation)}
                </div>
            `);
      score++;
    } else {
      wrongSound.play();
      $('.option.selected').addClass('incorrect');
      $explanation.html(`
                <div class="card card-error">
                     <i class="fas fa-times mr-2"></i>
                    <strong>Incorrect!</strong><br><br>
                    ${renderContent(currentQuestion.question.explanation)}
                </div>
            `);
    }

    questionProgress[currentQuestionIndex].userAnswer = selected;
  } else if (currentQuestion.type === 'integer') {
    const userAnswer = $answerInputField.val();
    const correctAnswer = currentQuestion.question.answer;

    isCorrect = userAnswer === correctAnswer.toString();

    if (isCorrect) {
      correctSound.play();
      $explanation.html(`
                <div class="card card-success">
                     <i class="fas fa-check mr-2"></i>
                    <strong>Correct!</strong><br>
                    ${renderContent(currentQuestion.question.explanation)}
                </div>
            `);
      score++;
    } else {
      wrongSound.play();
      $explanation.html(`
                <div class="card card-error">
                    <i class="fas fa-times mr-2"></i>
                    <strong>Incorrect!</strong> The correct answer is ${correctAnswer}<br>
                    ${renderContent(currentQuestion.question.explanation)}
                </div>
            `);
    }

    questionProgress[currentQuestionIndex].userAnswer = userAnswer;
  }

  questionProgress[currentQuestionIndex].answered = true;
  questionProgress[currentQuestionIndex].correct = isCorrect;
  updateQuestionListUI();
  $score.text(score);

  $nextQuestionButton.prop(
    'disabled',
    currentQuestionIndex === questions.length - 1
  );

  $(this).hide();
  if (currentQuestionIndex === questions.length - 1) {
    $resetQuizButton.show();
  }

  savelocalStorageData(subject, chapter, topic, questionProgress);

  renderMathJax();
});

$(document).on('click', '.subject-card', function () {
  subject = $(this).data('subject');
  chapter = '';
  topic = '';
  currentQuestionIndex = 0;
  clearSessionCache();
  updateURLParams({ subject });
  hideQuestionContainer();
  fetchChapters();
});

$(document).on('click', '.chapter', function () {
  chapter = $(this).data('chapter');
  topic = '';
  currentQuestionIndex = 0;
  clearSessionCache();
  updateURLParams({ subject, chapter });
  fetchTopics();
  hideQuestionContainer();
});

$(document).on('click', '.topic', function () {
  topic = $(this).data('topic');
  currentQuestionIndex = 0;
  clearSessionCache();
  updateURLParams({
    subject,
    chapter,
    topic,
    'question-number': currentQuestionIndex + 1,
  });
  fetchQuestions();
});

$(document).on('click', '.option', function () {
  if (!$(this).hasClass('disabled')) {
    $('.option').removeClass('selected');
    $(this).addClass('selected');
    $submitAnswerButton.show();
  }
});

$previousQuestionButton.click(function () {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    updateURLParams({
      subject,
      chapter,
      topic,
      'question-number': currentQuestionIndex + 1,
    });
    renderQuestion();
  }
});

$nextQuestionButton.click(function () {
  if (currentQuestionIndex < questions.length - 1) {
    currentQuestionIndex++;
    updateURLParams({
      subject,
      chapter,
      topic,
      'question-number': currentQuestionIndex + 1,
    });
    renderQuestion();
    stopTimer();
    startTimer();
  }
});

$backToSubjects.click(function () {
  fetchAndRenderSubjects();
  updateURLParams({});
  hideQuestionContainer();
  $chapterContainer.hide();
  $topicContainer.hide();
  $subjectContainer.show();
});

$backToChapters.click(function () {
  updateURLParams({ subject });
  fetchChapters();
  hideQuestionContainer();
  $topicContainer.hide();
  $chapterContainer.show();
});

// --- Breadcrumb Functions ---
function updateBreadcrumb() {
  $breadcrumbSubj.toggle(Boolean(subject));
  $breadcrumbChap.toggle(Boolean(chapter));
  $breadcrumbTopi.toggle(Boolean(topic));

  $breadcrumbSubject.text(subject.replace(/-/g, ' '));
  $breadcrumbChapter.text(chapter.replace(/-/g, ' '));
  $breadcrumbTopic.text(topic.replace(/-/g, ' '));
}

// --- UI Helper Functions ---
function hideQuestionContainer() {
  $questionContainer.hide();
  $questionSidebar.hide();
}

// --- Breadcrumb Navigation ---
$breadcrumbHome.click(function () {
  subject = '';
  chapter = '';
  topic = '';
  currentQuestionIndex = 0;
  fetchAndRenderSubjects();
  updateURLParams({});
  hideQuestionContainer();
  $chapterContainer.hide();
  $topicContainer.hide();
  $subjectContainer.show();
});

$breadcrumbSubject.click(function () {
  chapter = '';
  topic = '';
  currentQuestionIndex = 0;
  updateURLParams({ subject });
  fetchChapters();
  hideQuestionContainer();
  $topicContainer.hide();
  $chapterContainer.show();
});

$breadcrumbChapter.click(function () {
  topic = '';
  currentQuestionIndex = 0;
  fetchTopics();
  updateURLParams({ subject, chapter });
  hideQuestionContainer();
  $topicContainer.show();
});

$breadcrumbTopic.click(function () {
  currentQuestionIndex = 0;
  fetchQuestions();
  updateURLParams({
    subject,
    chapter,
    topic,
    'question-number': currentQuestionIndex + 1,
  });
  hideQuestionContainer();
  $questionContainer.show();
  $questionSidebar.show();
});

// --- Initialization ---
$(document).ready(() => {

  if (subject) {
    if (chapter) {
      if (topic) {
        fetchQuestions();
      } else {
        fetchTopics();
      }
    } else {
      fetchChapters();
    }
  } else {
    // fetchAndRenderImage();
    fetchAndRenderSubjects();
  }
});

// --- Dark Mode Toggle ---
$darkModeToggle.on('click', () => {
  isDarkMode = !isDarkMode;

  if (isDarkMode) {
    $html.addClass('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    $darkModeToggle.html('<i class="fas fa-sun"></i>');
    localStorage.setItem('darkMode', 'enabled');
  } else {
    $html.removeClass('dark');
    document.documentElement.setAttribute('data-theme', 'light');
    $darkModeToggle.html('<i class="fas fa-moon"></i>');
    localStorage.setItem('darkMode', 'disabled');
  }
});

function setInitialTheme() {
  if (isDarkMode) {
    $html.addClass('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    $darkModeToggle.html('<i class="fas fa-sun"></i>');
  } else {
    $html.removeClass('dark');
    document.documentElement.setAttribute('data-theme', 'light');
    $darkModeToggle.html('<i class="fas fa-moon"></i>');
  }
}

// --- Reset Quiz Button ---
$resetQuizButton.click(function () {
  fetchQuestions();
});

// --- URL Change Listener ---
window.addEventListener('urlchanged', () => {
  updateBreadcrumb();
});

// --- Bookmark Functionality ---
function updateBookmarkButtonUI(isBookmarked) {
  if (isBookmarked) {
    $bookmarkButton.html('<i class="fas fa-bookmark text-yellow-500"></i><p class="bookmark-text"> Unbookmark</p>');
  } else {
    $bookmarkButton.html('<i class="far fa-bookmark"></i><p class="bookmark-text"> Bookmark</p>');
  }
}

$bookmarkButton.click(function () {
    const index = currentQuestionIndex;
    questionProgress[index].bookmarked = !questionProgress[index].bookmarked;
    savelocalStorageData(subject, chapter, topic, questionProgress);
    updateQuestionListUI();
    updateBookmarkButtonUI(questionProgress[index].bookmarked);
  });
