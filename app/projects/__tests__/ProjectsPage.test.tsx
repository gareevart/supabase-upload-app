import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import MyProjects from '../../components/MyProjects/MyProjects';
import en from '@/app/playground/Playground.i18n/en.json';
import ru from '@/app/playground/Playground.i18n/ru.json';
import ProjectsPage from '../page';

jest.mock('@/app/contexts/I18nContext', () => ({
  useI18n: () => ({
    t: (key: keyof typeof en) =>
      (localStorage.getItem('app-language') === 'ru' ? ru : en)[key] ?? 'Uploader',
  }),
}));

afterEach(() => localStorage.clear());

test('shows Playground as a regular Gravity UI project card with a plain description', () => {
  render(<ProjectsPage />);

  const uploader = screen.getByRole('link', { name: 'Uploader' });
  const playground = screen.getByRole('link', { name: 'Playground' });

  expect(playground.parentElement).toBe(uploader.parentElement);
  expect(playground.parentElement).toHaveClass('group-container');
  expect(playground.firstElementChild).toHaveClass('g-card', 'g-card_size_l', 'project-card');
  expect(playground.firstElementChild?.className).toBe(uploader.firstElementChild?.className);
  expect(playground).toHaveAttribute('href', '/projects/playground');
  expect(playground).toHaveAccessibleDescription('Cloud IDE for JavaScript, TypeScript, Python and Vite projects.');
  expect(screen.getByText('Playground', { exact: true })).toBeInTheDocument();
});

test('does not add Playground to other project group instances', () => {
  render(<MyProjects />);

  expect(screen.getByRole('link', { name: 'Uploader' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Playground' })).not.toBeInTheDocument();
});

test('translates the Projects heading and Playground card together', () => {
  localStorage.setItem('app-language', 'ru');
  render(<ProjectsPage />);
  expect(screen.getByRole('heading', { name: 'Проекты' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Playground' })).toHaveAccessibleDescription(ru['playground.cardDescription']);
});
