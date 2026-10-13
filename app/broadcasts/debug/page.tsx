"use client";

import React from 'react';
import '../../debug/debug-pages.css';

const DebugBroadcastPage = () => {
  const [debugResult, setDebugResult] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const testAPI = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/debug/test-broadcast');
      const data = await response.json();
      setDebugResult({ status: response.status, data });
    } catch (error) {
      setDebugResult({
        error: true,
        message: error instanceof Error ? error.message : String(error),
        status: 'Network Error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="debug-page">
      <h1 className="debug-page__title" style={{ fontSize: '1.875rem', fontWeight: 700 }}>Отладка Broadcast Редактирования</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="debug-broadcast__warning">
          <h2 className="debug-broadcast__warning-title">🔍 Проблема выяснена</h2>
          <p className="debug-broadcast__warning-text">Отсутствие активной сессии аутентификации (401 Unauthorized)</p>
        </div>

        <div className="debug-broadcast__card">
          <h2 className="debug-broadcast__card-title">Что делать:</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <h3 className="debug-broadcast__section-title">1. Авторизуйтесь в системе</h3>
              <p className="debug-broadcast__section-text">
                Перейдите на страницу <a href="/auth" className="debug-broadcast__link" target="_blank">/auth</a> и войдите в аккаунт
              </p>
            </div>

            <div>
              <h3 className="debug-broadcast__section-title">2. Проверьте статус API</h3>
              <div className="debug-broadcast__buttons">
                <button
                  onClick={testAPI}
                  disabled={isLoading}
                  className="debug-broadcast__button"
                >
                  {isLoading ? 'Проверка...' : 'Протестировать API'}
                </button>
                <button
                  onClick={() => window.open('/auth', '_blank')}
                  className="debug-broadcast__button debug-broadcast__button--gray"
                >
                  Open Authorization
                </button>
              </div>
            </div>

            <div>
              <h3 className="debug-broadcast__section-title">3. После авторизации</h3>
              <p className="debug-broadcast__section-text">
                Вернитесь к странице редактирования: <a
                  href="/broadcasts/edit/6eec7e5b-b2f9-424d-a4ca-f3f9f4c336d2"
                  className="debug-broadcast__link"
                  target="_blank"
                >
                  /broadcasts/edit/[id]
                </a>
              </p>
            </div>
          </div>
        </div>

        {debugResult && (
          <div className="debug-broadcast__result">
            <h2 className="debug-broadcast__card-title">Результат тестирования:</h2>
            <div className={`debug-broadcast__result-block ${
              debugResult.error
                ? 'debug-broadcast__result-block--error'
                : debugResult.status === 200
                  ? 'debug-broadcast__result-block--success'
                  : 'debug-broadcast__result-block--warning'
            }`}>
              <pre className="debug-broadcast__result-pre">
                {JSON.stringify(debugResult, null, 2)}
              </pre>
            </div>

            {debugResult.status === 401 && (
              <div className="debug-broadcast__info-block">
                <p className="debug-broadcast__info-text">
                  ✅ This is expected error! Authorize in the system and the problem will be resolved.
                </p>
              </div>
            )}

            {debugResult.status === 200 && (
              <div className="debug-broadcast__success-block">
                <p className="debug-broadcast__success-text">
                  ✅ Authorization successful! Now you can edit broadcasts.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugBroadcastPage;