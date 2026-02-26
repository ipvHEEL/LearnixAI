import { useMemo, useState } from 'react';
import './NewsFeed.css';

const sampleNews = [
  {
    id: 1,
    category: 'Технологии',
    title: 'Open-source AI ускоряет запуск EdTech-платформ',
    summary:
      'Новые библиотеки и локальные модели позволили стартапам запускать персонализированное обучение в 2 раза быстрее.',
    source: 'Learnix Daily',
    time: '2 часа назад',
    color: 'linear-gradient(180deg, #7a2ef7 0%, #820f85 56%, #280020 100%)'
  },
  {
    id: 2,
    category: 'Образование',
    title: 'Университеты внедряют микро-курсы в формате Shorts',
    summary:
      'Короткие 90-секундные видео повышают вовлеченность студентов и помогают повторять материал прямо в телефоне.',
    source: 'EdFuture',
    time: '4 часа назад',
    color: 'linear-gradient(180deg, #304ffe 0%, #4f6fe7 45%, #060f2e 100%)'
  },
  {
    id: 3,
    category: 'Бизнес',
    title: 'Компании увеличивают бюджет на внутреннее обучение сотрудников',
    summary:
      'Спрос на upskilling вырос после автоматизации рутинных задач. Лидируют программы по AI-грамотности.',
    source: 'Market Pulse',
    time: '6 часов назад',
    color: 'linear-gradient(180deg, #b3471c 0%, #ad5f15 50%, #3a1a00 100%)'
  },
  {
    id: 4,
    category: 'Наука',
    title: 'Исследователи доказали эффективность интервального повторения',
    summary:
      'Нейрокогнитивные тесты показали, что короткие циклы повторения увеличивают долгосрочное запоминание до 35%.',
    source: 'NeuroLab',
    time: '8 часов назад',
    color: 'linear-gradient(180deg, #00a497 0%, #3d6fca 55%, #071028 100%)'
  }
];

const profileLinks = [
  'Моя страница',
  'Новости',
  'Сообщения',
  'Друзья',
  'Сообщества',
  'Фотографии',
  'Музыка'
];

const sectionLinks = ['Новости', 'Фотографии', 'Подкасты', 'Рекомендации', 'Поиск'];

function NewsFeed() {
  const [likes, setLikes] = useState({});
  const [saved, setSaved] = useState({});
  const [interestingFirst, setInterestingFirst] = useState(true);

  const totalLikes = useMemo(
    () => Object.values(likes).reduce((acc, current) => acc + current, 0),
    [likes]
  );

  const updateLike = (id, value) => {
    setLikes((prev) => ({ ...prev, [id]: value }));
  };

  const toggleSave = (id) => {
    setSaved((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <main className="news-feed-page">
      <div className="news-layout">
        <aside className="nav-panel left-panel" aria-label="Навигация профиля">
          {profileLinks.map((link) => (
            <button key={link} className="panel-link" type="button">
              {link}
            </button>
          ))}
        </aside>

        <section className="news-main" aria-label="Лента новостей в стиле TikTok">
          <header className="news-feed-header">
            <h1>Лента новостей</h1>
            <p>Свайпай вверх/вниз или прокручивай колесом мыши</p>
            <span className="news-feed-counter">Реакций: {totalLikes}</span>
          </header>

          <div className="news-feed">
            {sampleNews.map((news) => {
              const currentLike = likes[news.id] ?? 0;
              const isSaved = Boolean(saved[news.id]);

              return (
                <article
                  key={news.id}
                  className="news-card"
                  style={{ backgroundImage: news.color }}
                >
                  <div className="news-card-overlay" />
                  <div className="news-card-content">
                    <span className="news-category">{news.category}</span>
                    <h2>{news.title}</h2>
                    <p>{news.summary}</p>

                    <div className="news-meta">
                      <span>{news.source}</span>
                      <span>{news.time}</span>
                    </div>
                  </div>

                  <aside className="news-actions" aria-label="Действия с новостью">
                    <button
                      type="button"
                      className={currentLike === 1 ? 'active' : ''}
                      onClick={() => updateLike(news.id, currentLike === 1 ? 0 : 1)}
                      aria-label="Нравится"
                    >
                      👍
                    </button>
                    <button
                      type="button"
                      className={currentLike === -1 ? 'active' : ''}
                      onClick={() => updateLike(news.id, currentLike === -1 ? 0 : -1)}
                      aria-label="Не нравится"
                    >
                      👎
                    </button>
                    <button
                      type="button"
                      className={isSaved ? 'active' : ''}
                      onClick={() => toggleSave(news.id)}
                      aria-label="Сохранить"
                    >
                      📌
                    </button>
                  </aside>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="right-column" aria-label="Правая колонка разделов">
          <section className="nav-panel right-panel">
            <h3>Разделы</h3>
            {sectionLinks.map((link) => (
              <button key={link} className="panel-link" type="button">
                {link}
              </button>
            ))}
          </section>

          <section className="nav-panel right-switcher">
            <div className="switch-row">
              <span>Сначала интересные</span>
              <button
                type="button"
                className={`switch ${interestingFirst ? 'active' : ''}`}
                onClick={() => setInterestingFirst((prev) => !prev)}
                aria-pressed={interestingFirst}
              >
                <span className="switch-thumb" />
              </button>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

export default NewsFeed;
