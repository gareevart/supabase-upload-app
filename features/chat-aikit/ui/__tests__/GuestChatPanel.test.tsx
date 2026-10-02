import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { GuestChatPanel } from '../GuestChatPanel';

jest.mock('@/app/contexts/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => ({
    'chatView.breadcrumbNewChat': 'New chat',
    'chatView.settingsTooltip': 'Chat settings',
    'chatView.settingsTitle': 'Chat settings',
    'chatView.guestRegisterTitle': 'Want another chat?',
    'chatView.guestRegisterAction': 'Sign up',
  }[key] || key) }),
}));

const setSelectedModel = jest.fn();
jest.mock('@/app/contexts/ModelSelectionContext', () => ({
  useModelSelection: () => ({
    selectedModel: 'gpt-oss-20b',
    setSelectedModel,
    availableModels: ['nemotron-3-nano', 'gpt-oss-20b', 'gpt-oss-120b'],
  }),
}));

jest.mock('@gravity-ui/aikit', () => ({
  ActionButton: ({ children, onClick, tooltipTitle }: {
    children: React.ReactNode;
    onClick: () => void;
    tooltipTitle: string;
  }) => <button onClick={onClick} title={tooltipTitle}>{children}</button>,
  ChatContainer: ({ onSendMessage, messages, promptInputProps }: {
    onSendMessage: (data: { content: string }) => void;
    messages: Array<{ content: string }>;
    promptInputProps?: { footerProps?: { bottomContent?: React.ReactNode } };
  }) => (
    <div>
      <button onClick={() => onSendMessage({ content: 'First question' })}>Ask first</button>
      <button onClick={() => onSendMessage({ content: 'Second question' })}>Ask second</button>
      <span data-testid="message-count">{messages.length}</span>
      <div data-testid="prompt-footer">{promptInputProps?.footerProps?.bottomContent}</div>
    </div>
  ),
}));

jest.mock('@gravity-ui/uikit', () => {
  const Breadcrumbs = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  Breadcrumbs.Item = ({ children }: { children: React.ReactNode }) => <span>{children}</span>;
  const Dialog = ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div>{children}</div> : null;
  Dialog.Header = ({ caption }: { caption: string }) => <h2>{caption}</h2>;
  Dialog.Body = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  Dialog.Footer = ({ children, textButtonApply, onClickButtonApply }: {
    children?: React.ReactNode;
    textButtonApply?: string;
    onClickButtonApply?: () => void;
  }) => <div>{children}{textButtonApply && <button onClick={onClickButtonApply}>{textButtonApply}</button>}</div>;
  return {
    Breadcrumbs,
    Dialog,
    Button: ({ children, onClick, title }: { children: React.ReactNode; onClick?: () => void; title?: string }) => <button onClick={onClick} title={title}>{children}</button>,
    Icon: () => <span>icon</span>,
    Select: ({ options }: { options: Array<{ value: string }> }) => <div>{options.map((option) => <span key={option.value}>{option.value}</span>)}</div>,
    Spin: () => <span>Loading</span>,
    Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    TextArea: () => <textarea />,
  };
});

describe('GuestChatPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(globalThis.crypto, 'randomUUID', { configurable: true, value: jest.fn()
      .mockReturnValueOnce('user-1').mockReturnValueOnce('assistant-1')
      .mockReturnValueOnce('user-2').mockReturnValueOnce('assistant-2') });
  });

  it('keeps follow-up questions in one chat and offers sign-up for another', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ text: 'First answer' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ text: 'Second answer' }) });
    global.fetch = fetchMock;

    const view = render(<GuestChatPanel />);
    fireEvent.click(screen.getByText('Ask first'));
    await waitFor(() => expect(screen.getByTestId('message-count')).toHaveTextContent('2'));

    fireEvent.click(screen.getByText('Ask second'));
    await waitFor(() => expect(screen.getByTestId('message-count')).toHaveTextContent('4'));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).messages).toEqual([
      { role: 'user', text: 'First question' },
      { role: 'assistant', text: 'First answer' },
      { role: 'user', text: 'Second question' },
    ]);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).model).toBe('gpt-oss-20b');

    expect(screen.getByTestId('prompt-footer')).toContainElement(screen.getByTitle('Chat settings'));
    fireEvent.click(screen.getByTitle('Chat settings'));
    expect(screen.getByText('Chat settings')).toBeInTheDocument();
    expect(screen.getByText('nemotron-3-nano')).toBeInTheDocument();
    expect(screen.getByText('gpt-oss-20b')).toBeInTheDocument();
    expect(screen.getByText('gpt-oss-120b')).toBeInTheDocument();

    fireEvent.click(screen.getByText('New chat'));
    expect(screen.getByText('Want another chat?')).toBeInTheDocument();
    expect(screen.getByText('Sign up').closest('a')).toHaveAttribute('href', '/auth/signup');

    view.unmount();
    render(<GuestChatPanel />);
    expect(screen.getByTestId('message-count')).toHaveTextContent('4');
  });
});
