'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

export class AIErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('AI widget failed', error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      const russian = typeof document !== 'undefined' && document.documentElement.lang === 'ru';
      return (
        <div className="card p-5 text-center">
          <p className="font-medium text-clinical-900">{russian ? 'AI-помощник временно недоступен' : 'AI assistant is temporarily unavailable'}</p>
          <p className="mt-1 text-sm text-clinical-500">{russian ? 'Главная страница и данные восстановления продолжают работать.' : 'Your dashboard and recovery data are still available.'}</p>
          <button
            type="button"
            onClick={() => this.setState({ failed: false })}
            className="btn-secondary mt-3"
          >
            {russian ? 'Попробовать снова' : 'Try AI again'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
