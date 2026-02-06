"use client";

import React from 'react';

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
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Отладка Broadcast Редактирования</h1>

      <div className="space-y-6">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4">
          <h2 className="font-bold text-yellow-800">🔍 Проблема выяснена</h2>
          <p className="text-yellow-700">Отсутствие активной сессии аутентификации (401 Unauthorized)</p>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Что делать:</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-gray-800">1. Авторизуйтесь в системе</h3>
              <p className="text-gray-600">
                Перейдите на страницу <a href="/auth" className="text-blue-500 hover:underline font-medium" target="_blank">/auth</a> и войдите в аккаунт
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-800">2. Проверьте статус API</h3>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={testAPI}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {isLoading ? 'Проверка...' : 'Протестировать API'}
                </button>
                <button
                  onClick={() => window.open('/auth', '_blank')}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Open Authorization
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-gray-800">3. После авторизации</h3>
              <p className="text-gray-600">
                Вернитесь к странице редактирования: <a
                  href="/broadcasts/edit/6eec7e5b-b2f9-424d-a4ca-f3f9f4c336d2"
                  className="text-blue-500 hover:underline font-medium"
                  target="_blank"
                >
                  /broadcasts/edit/[id]
                </a>
              </p>
            </div>
          </div>
        </div>

        {debugResult && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Результат тестирования:</h2>
            <div className={`p-4 rounded ${
              debugResult.error
                ? 'bg-red-50 border border-red-200'
                : debugResult.status === 200
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <pre className="text-sm overflow-auto max-h-96 font-mono">
                {JSON.stringify(debugResult, null, 2)}
              </pre>
            </div>

            {debugResult.status === 401 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-blue-800 font-medium">
                  ✅ This is expected error! Authorize in the system and the problem will be resolved.
                </p>
              </div>
            )}

            {debugResult.status === 200 && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-green-800 font-medium">
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