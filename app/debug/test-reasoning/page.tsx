"use client"
import { useState } from "react";
import { Button, TextArea, Text, Container } from "@gravity-ui/uikit";
import { useAuth } from "@/app/contexts/AuthContext";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/client-supabase";

const TestReasoningPage = () => {
  const { user, loading: isAuthLoading } = useAuth();
  const [prompt, setPrompt] = useState("Решите задачу: У Анны есть 3 яблока, у Бориса в 2 раза больше яблок, чем у Анны. Сколько яблок у них вместе?");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [reasoningMode, setReasoningMode] = useState(false);

  if (isAuthLoading) {
    return <Container><div className="py-8 text-center">Загрузка...</div></Container>;
  }

  if (!user) {
    redirect("/auth");
    return null;
  }

  const testAPI = async () => {
    setLoading(true);
    setResponse("");

    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Пользователь не авторизован');
      }

      const response = await fetch('/api/generate-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prompt: prompt,
          systemPrompt: 'Ты помощник, который решает задачи пошагово.',
          messageContext: [],
          model: 'yandexgpt',
          reasoningMode: reasoningMode
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Ошибка:', error);
      setResponse(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <div className="py-8 space-y-4">
        <Text variant="header-1">Тест режима рассуждений</Text>
        
        <div className="space-y-2">
          <Text variant="body-2">Тестовый промпт:</Text>
          <TextArea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex items-center space-x-4">
          <Button
            onClick={() => setReasoningMode(!reasoningMode)}
            view={reasoningMode ? "action" : "outlined"}
          >
            {reasoningMode ? "Режим рассуждений ВКЛ" : "Режим рассуждений ВЫКЛ"}
          </Button>
          
          <Button
            onClick={testAPI}
            disabled={loading}
            view="action"
          >
            {loading ? "Отправка..." : "Тестировать API"}
          </Button>
        </div>

        {response && (
          <div className="space-y-2">
            <Text variant="body-2">Ответ API:</Text>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {response}
            </pre>
          </div>
        )}
      </div>
    </Container>
  );
};

export default TestReasoningPage;
