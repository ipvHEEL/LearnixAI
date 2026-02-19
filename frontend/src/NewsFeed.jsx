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
    color: 'linear-gradient(160deg, #7b2ff7 0%, #f107a3 100%)'
  },
  {
    id: 2,
    category: 'Образование',
    title: 'Университеты внедряют микро-курсы в формате Shorts',
    summary:
      'Короткие 90-секундные видео повышают вовлеченность студентов и помогают повторять материал прямо в телефоне.',
    source: 'EdFuture',
    time: '4 часа назад',
    color: 'linear-gradient(160deg, #00c9ff 0%, #92fe9d 100%)'
  },
  {
    id: 3,
    category: 'Бизнес',
    title: 'Компании увеличивают бюджет на внутреннее обучение сотрудников',
    summary:
      'Спрос на upskilling вырос после автоматизации рутинных задач. Лидируют программы по AI-грамотности.',
    source: 'Market Pulse',
    time: '6 часов назад',
    color: 'linear-gradient(160deg, #f7971e 0%, #ffd200 100%)'
  },
  {
    id: 4,
    category: 'Наука',
    title: 'Исследователи доказали эффективность интервального повторения',
    summary:
      'Нейрокогнитивные тесты показали, что короткие циклы повторения увеличивают долгосрочное запоминание до 35%.',
    source: 'NeuroLab',
    time: '8 часов назад',
    color: 'linear-gradient(160deg, #43cea2 0%, #185a9d 100%)'
  }
];

const menuItems = [
  'Моя страница',
  'Новости',
  'Сообщения',
  'Друзья',
  'Сообщества',
  'Фотографии',
  'Музыка'
];

const rightMenuItems = ['Новости', 'Фотографии', 'Подкасты', 'Рекомендации', 'Поиск'];

function NewsFeed() {
  const [likes, setLikes] = useState({});
  const [saved, setSaved] = useState({});

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
        <aside className="left-sidebar" aria-label="Основная навигация">
          <ul>
            {menuItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>

        <section className="news-center-column">
          <header className="news-feed-header">
            <h1>Лента новостей</h1>
            <p>Свайпай вверх/вниз или прокручивай колесом мыши</p>
            <span className="news-feed-counter">Реакций: {totalLikes}</span>
          </header>

          <section className="news-feed" aria-label="Лента новостей в стиле TikTok">
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
                      className={currentLike === 1 ? 'active' : ''}
                      onClick={() => updateLike(news.id, currentLike === 1 ? 0 : 1)}
                      aria-label="Нравится"
                    >
                      👍
                    </button>
                    <button
                      className={currentLike === -1 ? 'active' : ''}
                      onClick={() => updateLike(news.id, currentLike === -1 ? 0 : -1)}
                      aria-label="Не нравится"
                    >
                      👎
                    </button>
                    <button
                      className={isSaved ? 'active' : ''}
                      onClick={() => toggleSave(news.id)}
                      aria-label="Сохранить"
                    >
                      🔖
                    </button>
                  </aside>
                </article>
              );
            })}
          </section>
        </section>

        <aside className="right-sidebar" aria-label="Управление профилем">
          <div className="right-card">
            <h3>Разделы</h3>
            <ul>
              {rightMenuItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="right-card profile-switch">
            <span>Сначала интересные</span>
            <button type="button" aria-label="Переключить сначала интересные">
              ○
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default NewsFeed;
