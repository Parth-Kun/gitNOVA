const API_BASE = 'https://qapi-xbw7.onrender.com/';
let subject = '',
  chapter = '',
  topic = '',
  questions = [],
  currentQuestionIndex = 0,
  timer = 0,
  timerInterval;
let questionProgress = [];
let isManualScroll = false;
let scrollTimeoutId = null;
let isDarkMode = localStorage.getItem('darkMode') === 'enabled';
let score = 0;

// Breadcrumb update at starting
updateBreadcrumb();
setInitialTheme();

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secondsRemaining = seconds % 60;
  let timeString = '';
  if (minutes > 0) {
    timeString += minutes + 'm ';
  }
  if (secondsRemaining > 0) {
    timeString += secondsRemaining + 's';
  }
  return timeString;
}

function startTimer() {
  timer = 0;
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timer++;
    $('#timer').text(formatTime(timer));
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
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

function fetchAndRenderSubjects() {
  $('#subject-container').show();
  $('#subjects').html('');
  ['maths', 'physics', 'chemistry'].forEach(sub => {
    $('#subjects').append(`
            <button class='btn font-bold capitalize subject ' data-subject='${sub}'>
                ${sub}
            </button>
        `);
  });
}

function fetchChapters() {
  $.get(`${API_BASE}${subject}`, data => {
    $('#chapter-container').show();
    $('#chapters').html('');
    data.chapters.forEach(ch => {
      $('#chapters').append(`
                 <button class='btn font-bold capitalize chapter ' data-chapter='${ch}'>
                    ${ch.replace(/-/g, ' ')}
                </button>
            `);
    });
    $('#subject-container').hide();
  });
}

function fetchTopics() {
  $.get(`${API_BASE}${subject}/${chapter}`, data => {
    $('#topic-container').show();
    $('#topics').html('');
    data.topics.forEach(tp => {
      $('#topics').append(`
                 <button class='btn font-bold capitalize topic ' data-topic='${tp}'>
                    ${tp.replace(/-/g, ' ')}
                </button>
            `);
    });
    $('#chapter-container').hide();
  });
}

function initQuestionProgress() {
  score = 0;
  $('#score').text(score);
  questionProgress = questions.map((q, index) => ({
    index: index,
    answered: false,
    correct: null,
    type: q.type,
  }));
  updateQuestionListUI();
}

function updateQuestionListUI() {
  const questionList = $(`
        <div id="question-list-container" class="flex flex-nowrap">
            ${questionProgress
              .map(
                q => `
                 <div class="question-item btn font-bold  capitalize ${
                   q.answered
                     ? q.correct
                       ? 'btn-success text-white text'
                       : 'btn-error text-white'
                     : 'border-black text'
                 }" data-index="${q.index}">
                    Q${q.index + 1}
                    ${
                      q.answered
                        ? q.correct
                          ? '<i class="fas fa-check"></i>'
                          : '<i class="fas fa-times"></i>'
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
    renderQuestion();
  });

  $('#question-list-container').remove();
  $('#question-sidebar').html(questionList);

  const container = $('#question-sidebar');
  container.on('scroll', function () {
    isManualScroll = true;
    clearTimeout(scrollTimeoutId);
    scrollTimeoutId = setTimeout(function () {
      isManualScroll = false;
    }, 500);
  });

  // Center the current question
  const currentQuestionItem = $(
    `.question-item[data-index="${currentQuestionIndex}"]`
  );
  const itemHeight = currentQuestionItem.outerHeight();
  const containerHeight = container.outerHeight();
  const itemTop = currentQuestionItem.position().top;
  const newScrollTop = itemTop - (containerHeight - itemHeight) / 2;

  // Adjust scroll position on container scroll
  container.on('scroll', function () {
    const currentScrollTop = container.scrollTop();
    const currentQuestionItem = $(
      `.question-item[data-index="${currentQuestionIndex}"]`
    );
    const itemTop = currentQuestionItem.position().top;
    const newScrollTop = itemTop - (containerHeight - itemHeight) / 2;
    if (Math.abs(currentScrollTop - newScrollTop) > 10) {
    }
  });

  // Add a timeout to ensure the container has finished rendering
  setTimeout(function () {}, 100);
}

function fetchQuestions() {
  $.get(`${API_BASE}${subject}/${chapter}/${topic}`, data => {
    questions = data.questions.reverse();
    currentQuestionIndex = 0;
    $('#total-questions-number').text(questions.length);
    $('#question-container').show();
    initQuestionProgress();
    renderQuestion();
    $('#topic-container').hide();
    $('#question-sidebar').show();
  });
}

function renderQuestion() {
  if (!questions.length) return;

  const currentQuestion = questions[currentQuestionIndex];
  const q = currentQuestion.question;
  $('#reset-quiz-button').hide();

  // Update question number and paper title
  $('#current-question-number').text(currentQuestionIndex + 1);
  $('#paper-title').text(currentQuestion.paperTitle || '');

  $('#question-content').html(renderContent(q.content));
  $('#submit-answer-button').prop('disabled', false);
  $('.option').removeClass('disabled');
  $('#answer-input-field').prop('disabled', false);

  // Render based on question type
  if (currentQuestion.type === 'mcq') {
    const options = q.options
      .map(opt => {
        const renderedContent = renderContent(opt.content);
        return `
                <button class='btn font-bold option' data-identifier='${opt.identifier}'>
                    ${renderedContent}
                </button>
            `;
      })
      .join('');
    $('#answer-options').html(options);
    $('#answer-input-field').hide();
    $('#answer-options').show();
  } else if (currentQuestion.type === 'integer') {
    $('#answer-options').hide();
    $('#answer-input-field')
      .show()
      .val('') // Clear previous input
      .attr('type', 'number');
  }

  // Reset previous states
  $('.option').removeClass('selected correct incorrect');
  $('#explanation').html('');
  $('#submit-answer-button').show();

  // Manage navigation buttons
  $('#previous-question-button').prop('disabled', currentQuestionIndex === 0);
  $('#next-question-button').prop(
    'disabled',
    currentQuestionIndex === questions.length - 1
  );

  // Highlight current question in list and scroll to it
  $('.question-item').removeClass('active');
  const currentQuestionItem = $(
    `.question-item[data-index="${currentQuestionIndex}"]`
  );
  currentQuestionItem.addClass('active');

  const container = $('#question-sidebar');
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

  startTimer();
  renderMathJax();
}

// Event Listeners
$(document).on('click', '.subject', function () {
  subject = $(this).data('subject');
  chapter = '';
  topic = '';
  updateBreadcrumb();
  fetchChapters();
  hideQuestionContainer();
});

$(document).on('click', '.chapter', function () {
  chapter = $(this).data('chapter');
  topic = '';
  updateBreadcrumb();
  fetchTopics();
  hideQuestionContainer();
});

$(document).on('click', '.topic', function () {
  topic = $(this).data('topic');
  updateBreadcrumb();
  fetchQuestions();
  hideQuestionContainer();
});

$(document).on('click', '.option', function () {
  if (!$(this).hasClass('disabled')) {
    $('.option').removeClass('selected');
    $(this).addClass('selected');
    $('#submit-answer-button').show();
  }
});

$('#submit-answer-button').click(function () {
  stopTimer();
  $(this).prop('disabled', true);
  $('.option').addClass('disabled');
  $('#answer-input-field').prop('disabled', true);

  const currentQuestion = questions[currentQuestionIndex];
  let isCorrect = false;

  // Add audio elements for correct and wrong answers
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
     $('#explanation').html(`
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
     $('#explanation').html(`
                <div class="card card-error">
                     <i class="fas fa-times mr-2"></i>
                    <strong>Incorrect!</strong><br>
                    ${renderContent(currentQuestion.question.explanation)}
                </div>
            `);
    }
  } else if (currentQuestion.type === 'integer') {
    const userAnswer = $('#answer-input-field').val();
    const correctAnswer = currentQuestion.question.answer;

    isCorrect = userAnswer === correctAnswer.toString();

    if (isCorrect) {
      correctSound.play();
     $('#explanation').html(`
                <div class="card card-success">
                     <i class="fas fa-check mr-2"></i>
                    <strong>Correct!</strong><br>
                    ${renderContent(currentQuestion.question.explanation)}
                </div>
            `);
      score++;
    } else {
      wrongSound.play();
      $('#explanation').html(`
                <div class="card card-error">
                    <i class="fas fa-times mr-2"></i>
                    <strong>Incorrect!</strong> The correct answer is ${correctAnswer}<br>
                    ${renderContent(currentQuestion.question.explanation)}
                </div>
            `);
    }
  }

  // Update question progress
  questionProgress[currentQuestionIndex].answered = true;
  questionProgress[currentQuestionIndex].correct = isCorrect;
  updateQuestionListUI();
  $('#score').text(score);

  // Always enable next button after checking
  $('#next-question-button').prop(
    'disabled',
    currentQuestionIndex === questions.length - 1
  );

  // Hide check answer button after first use
  $(this).hide();
  if (currentQuestionIndex === questions.length - 1) {
    $('#reset-quiz-button').show();
  }

  renderMathJax();
});

$('#previous-question-button').click(function () {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderQuestion();
  }
});

$('#next-question-button').click(function () {
  if (currentQuestionIndex < questions.length - 1) {
    currentQuestionIndex++;
    renderQuestion();
    stopTimer();
    startTimer();
  }
});

// Back navigation buttons
$('#back-to-subjects').click(function () {
  $('#chapter-container').hide();
  $('#subject-container').show();
});

$('#back-to-chapters').click(function () {
  $('#topic-container').hide();
  $('#chapter-container').show();
});

function updateBreadcrumb() {
  $('#breadcrumb-subject').text(subject).toggle(Boolean(subject));
  $('#breadcrumb-chapter')
    .text(chapter.replace(/-/g, ' '))
    .toggle(Boolean(chapter));
  $('#breadcrumb-topic').text(topic.replace(/-/g, ' ')).toggle(Boolean(topic));
}

function hideQuestionContainer() {
  $('#question-container').hide();
  $('#question-sidebar').hide();
}

// Breadcrumb navigation
$('#breadcrumb-home').click(function () {
  subject = '';
  chapter = '';
  topic = '';
  updateBreadcrumb();
  hideQuestionContainer();
  $('#chapter-container').hide();
  $('#topic-container').hide();
  $('#subject-container').show();
});

$('#breadcrumb-subject').click(function () {
  chapter = '';
  topic = '';
  updateBreadcrumb();
  hideQuestionContainer();
  $('#topic-container').hide();
  $('#chapter-container').show();
});

$('#breadcrumb-chapter').click(function () {
  topic = '';
  updateBreadcrumb();
  hideQuestionContainer();
  $('#topic-container').show();
});

$('#breadcrumb-topic').click(function () {
  updateBreadcrumb();
  hideQuestionContainer();
  $('#question-container').show();
});

$(document).ready(() => {
  fetchAndRenderSubjects();
  setInitialTheme();
});

function hideQuestionContainer() {
  $('#question-container').hide();
  $('#question-sidebar').hide();
}

// Dark Mode Toggle
document.getElementById('dark-mode-toggle').addEventListener('click', () => {
  const body = document.body;
  const toggle = document.getElementById('dark-mode-toggle');
  const html = document.querySelector('html');

  isDarkMode = !isDarkMode;

  if (isDarkMode) {
    html.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'sunset');
    toggle.innerHTML = '<i class="fas fa-sun"></i>';
    localStorage.setItem('darkMode', 'enabled');
  } else {
      html.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    toggle.innerHTML = '<i class="fas fa-moon"></i>';
    localStorage.setItem('darkMode', 'disabled');
  }
});

function setInitialTheme() {
  const toggle = document.getElementById('dark-mode-toggle');
  const html = document.querySelector('html');

  if (isDarkMode) {
    html.classList.add('dark');
    toggle.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    html.classList.remove('dark');
    toggle.innerHTML = '<i class="fas fa-moon"></i>';
  }
}

// Reset Quiz Button
$('#reset-quiz-Button').click(function () {
  fetchQuestions();
});