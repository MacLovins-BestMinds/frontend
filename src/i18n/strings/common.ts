import { strings } from '../define';

// Общее для нескольких экранов: шапка, уровни, режимы, жюри, звания, единицы и ошибки запросов.
export default strings(
  {
    back: 'Back',
    menu: 'Menu',
    home: 'Home',
    profile: 'Profile',
    close: 'Close',
    tryAgain: 'Try again',
    loading: 'Loading…',
    language: 'Language',
    languageNow: 'Language: {name}',

    difficulty: 'Difficulty',
    'level.easy': 'Easy',
    'level.medium': 'Medium',
    'level.hard': 'Hard',
    'level.easy.note': 'Everyday topics, 5 minutes to prepare, a forgiving room and jury.',
    'level.medium.note': 'Topics you have to argue, 4 minutes to prepare, the jury asks why.',
    'level.hard.note': 'Big ideas, 3 minutes to prepare, a strict jury and a cold room.',

    'mode.training': 'Training',
    'mode.daily': 'Topic of the day',
    'mode.own': 'Own pitch',
    'mode.warmup': 'Warm-up',

    'juror.strict': 'Strict',
    'juror.kind': 'Kind',
    'juror.skeptic': 'Sceptic',

    'rank.novice': 'Novice',
    'rank.speaker': 'Speaker',
    'rank.pitcher': 'Pitcher',
    'rank.orator': 'Orator',
    'rank.legend': 'Legend',

    rangeSec: '{min}–{max} sec',
    rangeMin: '{min}–{max} min',
    minutes: '{n} min',

    camera: 'camera',
    noCamera: 'no camera',
    switchCamera: 'Switch camera',

    slide: 'Slide {n} of {total}',
    prevSlide: 'Previous slide',
    nextSlide: 'Next slide',

    errNoApi: 'EXPO_PUBLIC_API_URL is not set',
    errNetwork: 'Could not reach the server. Check your connection.',
    errTimeout: 'The server took too long to answer',
    errNoPitch: 'There is no recording of the pitch',
    errNoAnswer: 'There is no recording of the answer',

    errSlidesApp: 'Slides on stage work in the browser for now.',
    errSlidesViewer: 'The slide viewer did not load',
    errSlidesPdf: 'Slides can be shown from a PDF. Export your deck as PDF and upload it.',
    errSlidesRead: 'The file could not be read',
    errSlidesDraw: 'The slide could not be drawn',
    errSlidesEmpty: 'There are no pages in this PDF',

    errGoogleLoad: 'Google sign-in did not load',
    errGoogleAccount: 'Google did not return an account',
  },
  {
    ru: {
      back: 'Назад',
      menu: 'Меню',
      home: 'Главная',
      profile: 'Профиль',
      close: 'Закрыть',
      tryAgain: 'Попробовать ещё раз',
      loading: 'Загрузка…',
      language: 'Язык',
      languageNow: 'Язык: {name}',

      difficulty: 'Сложность',
      'level.easy': 'Лёгкий',
      'level.medium': 'Средний',
      'level.hard': 'Сложный',
      'level.easy.note': 'Темы из жизни, 5 минут на подготовку, добрые зал и жюри.',
      'level.medium.note': 'Темы, где нужны аргументы, 4 минуты на подготовку, жюри спрашивает «почему».',
      'level.hard.note': 'Большие идеи, 3 минуты на подготовку, строгое жюри и холодный зал.',

      'mode.training': 'Тренировка',
      'mode.daily': 'Тема дня',
      'mode.own': 'Свой питч',
      'mode.warmup': 'Разминка',

      'juror.strict': 'Строгий',
      'juror.kind': 'Добрый',
      'juror.skeptic': 'Скептик',

      'rank.novice': 'Новичок',
      'rank.speaker': 'Спикер',
      'rank.pitcher': 'Питчер',
      'rank.orator': 'Оратор',
      'rank.legend': 'Легенда',

      rangeSec: '{min}–{max} сек',
      rangeMin: '{min}–{max} мин',
      minutes: '{n} мин',

      camera: 'камера',
      noCamera: 'нет камеры',
      switchCamera: 'Сменить камеру',

      slide: 'Слайд {n} из {total}',
      prevSlide: 'Предыдущий слайд',
      nextSlide: 'Следующий слайд',

      errNoApi: 'Не задан EXPO_PUBLIC_API_URL',
      errNetwork: 'Не удалось связаться с сервером. Проверь интернет.',
      errTimeout: 'Сервер слишком долго не отвечает',
      errNoPitch: 'Нет записи питча',
      errNoAnswer: 'Нет записи ответа',

      errSlidesApp: 'Слайды на сцене пока работают только в браузере.',
      errSlidesViewer: 'Просмотр слайдов не загрузился',
      errSlidesPdf: 'Слайды можно показать только из PDF. Сохрани презентацию в PDF и загрузи её.',
      errSlidesRead: 'Не удалось прочитать файл',
      errSlidesDraw: 'Не удалось нарисовать слайд',
      errSlidesEmpty: 'В этом PDF нет страниц',

      errGoogleLoad: 'Вход через Google не загрузился',
      errGoogleAccount: 'Google не вернул аккаунт',
    },
    ro: {
      back: 'Înapoi',
      menu: 'Meniu',
      home: 'Acasă',
      profile: 'Profil',
      close: 'Închide',
      tryAgain: 'Încearcă din nou',
      loading: 'Se încarcă…',
      language: 'Limba',
      languageNow: 'Limba: {name}',

      difficulty: 'Dificultate',
      'level.easy': 'Ușor',
      'level.medium': 'Mediu',
      'level.hard': 'Greu',
      'level.easy.note': 'Teme din viața de zi cu zi, 5 minute de pregătire, sală prietenoasă și juriu blând.',
      'level.medium.note': 'Teme care cer argumente, 4 minute de pregătire, juriul întreabă „de ce”.',
      'level.hard.note': 'Idei mari, 3 minute de pregătire, un juriu sever și o sală rece.',

      'mode.training': 'Antrenament',
      'mode.daily': 'Tema zilei',
      'mode.own': 'Pitch propriu',
      'mode.warmup': 'Încălzire',

      'juror.strict': 'Sever',
      'juror.kind': 'Blând',
      'juror.skeptic': 'Sceptic',

      'rank.novice': 'Începător',
      'rank.speaker': 'Vorbitor',
      'rank.pitcher': 'Prezentator',
      'rank.orator': 'Orator',
      'rank.legend': 'Legendă',

      rangeSec: '{min}–{max} sec',
      rangeMin: '{min}–{max} min',
      minutes: '{n} min',

      camera: 'cameră',
      noCamera: 'fără cameră',
      switchCamera: 'Schimbă camera',

      slide: 'Slide-ul {n} din {total}',
      prevSlide: 'Slide-ul anterior',
      nextSlide: 'Slide-ul următor',

      errNoApi: 'EXPO_PUBLIC_API_URL nu este setat',
      errNetwork: 'Serverul nu poate fi contactat. Verifică conexiunea.',
      errTimeout: 'Serverul răspunde prea greu',
      errNoPitch: 'Nu există înregistrarea pitch-ului',
      errNoAnswer: 'Nu există înregistrarea răspunsului',

      errSlidesApp: 'Deocamdată slide-urile pe scenă merg doar în browser.',
      errSlidesViewer: 'Vizualizarea slide-urilor nu s-a încărcat',
      errSlidesPdf: 'Slide-urile pot fi afișate doar dintr-un PDF. Salvează prezentarea ca PDF și încarc-o.',
      errSlidesRead: 'Fișierul nu a putut fi citit',
      errSlidesDraw: 'Slide-ul nu a putut fi desenat',
      errSlidesEmpty: 'Acest PDF nu are pagini',

      errGoogleLoad: 'Conectarea cu Google nu s-a încărcat',
      errGoogleAccount: 'Google nu a returnat niciun cont',
    },
  },
);
