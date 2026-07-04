'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { cn } from '../lib/utils';

export type FeedbackType = 'success' | 'failure' | 'error' | 'progress';

export type ProgressLoadingStyle = 'bar' | 'dots';

export type FeedbackItem = {
  id: string;
  type: FeedbackType;
  message: string;
  title?: string;
  progress?: number;
  loadingStyle?: ProgressLoadingStyle;
  duration: number | null;
  createdAt: number;
  exiting?: boolean;
};

type FeedbackOptions = {
  id?: string;
  title?: string;
  duration?: number | null;
};

type ProgressOptions = FeedbackOptions & {
  progress?: number;
  loadingStyle?: ProgressLoadingStyle;
};

type FeedbackUpdate = Partial<
  Pick<FeedbackItem, 'message' | 'title' | 'progress' | 'type' | 'loadingStyle'>
>;

export type FeedbackAPI = {
  success: (message: string, options?: FeedbackOptions) => string;
  failure: (message: string, options?: FeedbackOptions) => string;
  error: (message: string, options?: FeedbackOptions) => string;
  progress: (message: string, options?: ProgressOptions) => string;
  update: (id: string, patch: FeedbackUpdate) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
};

const DEFAULT_DURATIONS: Record<FeedbackType, number | null> = {
  success: 4000,
  failure: 6000,
  error: 6000,
  progress: null,
};

const TYPE_LABELS: Record<FeedbackType, string> = {
  success: 'Success',
  failure: 'Failed',
  error: 'Error',
  progress: 'In progress',
};

function createId() {
  return `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

let globalDispatch: ((action: FeedbackAction) => void) | null = null;

type FeedbackAction =
  | { type: 'add'; item: FeedbackItem }
  | { type: 'update'; id: string; patch: FeedbackUpdate }
  | { type: 'dismiss'; id: string }
  | { type: 'dismiss-all' }
  | { type: 'exit'; id: string }
  | { type: 'remove'; id: string };

function stripTrailingEllipsis(message: string) {
  return message.replace(/\.{3}$|…$/u, '').trimEnd();
}

function FeedbackLoadingDots() {
  return (
    <span className="feedback-dots ml-0.5 inline-flex shrink-0" aria-hidden>
      <span>.</span>
      <span>.</span>
      <span>.</span>
    </span>
  );
}

function FeedbackIcon({ type }: { type: FeedbackType }) {
  if (type === 'progress') return null;

  if (type === 'success') {
    return (
      <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" aria-hidden>
        <path
          fill="currentColor"
          d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm3.78 6.03a.75.75 0 0 0-1.06-1.06l-3.47 3.47-1.47-1.47a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4-4Z"
        />
      </svg>
    );
  }

  if (type === 'failure') {
    return (
      <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" aria-hidden>
        <path
          fill="currentColor"
          d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm2.78 5.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.16a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.78Z"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" aria-hidden>
      <path
        fill="currentColor"
        d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm.75 4.75a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5ZM10 14a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"
      />
    </svg>
  );
}

const typeStyles: Record<FeedbackType, string> = {
  success:
    'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 [&_.feedback-title]:text-emerald-800 dark:[&_.feedback-title]:text-emerald-200',
  failure:
    'border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300 [&_.feedback-title]:text-amber-900 dark:[&_.feedback-title]:text-amber-100',
  error:
    'border-destructive/25 bg-destructive/10 text-destructive [&_.feedback-title]:text-destructive',
  progress:
    'border-primary/25 bg-primary/10 text-primary [&_.feedback-title]:text-primary',
};

function FeedbackToast({
  item,
  onDismiss,
}: {
  item: FeedbackItem;
  onDismiss: (id: string) => void;
}) {
  const isProgress = item.type === 'progress';
  const loadingStyle = item.loadingStyle ?? (isProgress ? 'dots' : undefined);
  const showProgressBar = isProgress && loadingStyle === 'bar';
  const hasDeterminateProgress = showProgressBar && typeof item.progress === 'number';
  const progressValue = hasDeterminateProgress
    ? Math.min(100, Math.max(0, item.progress ?? 0))
    : 0;
  const icon = FeedbackIcon({ type: item.type });

  return (
    <div
      role={item.type === 'error' ? 'alert' : 'status'}
      aria-live={item.type === 'error' ? 'assertive' : 'polite'}
      aria-busy={isProgress || undefined}
      className={cn(
        'feedback-toast pointer-events-auto w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border shadow-lg backdrop-blur-sm',
        typeStyles[item.type],
        item.exiting ? 'feedback-toast-exit' : 'feedback-toast-enter',
      )}
    >
      <div className={cn('flex items-start p-3.5 pr-2', icon ? 'gap-3' : 'gap-0')}>
        {icon && <div className="pt-0.5">{icon}</div>}
        <div className="min-w-0 flex-1 pt-0.5">
          {!(isProgress && loadingStyle === 'dots') && (
            <p className="feedback-title text-xs font-semibold tracking-wide uppercase opacity-90">
              {item.title ?? TYPE_LABELS[item.type]}
            </p>
          )}
          {isProgress && loadingStyle === 'dots' ? (
            <p className="flex min-w-0 items-baseline text-sm leading-snug font-medium">
              <span className="min-w-0 truncate">{stripTrailingEllipsis(item.message)}</span>
              <FeedbackLoadingDots />
            </p>
          ) : (
            <p
              className={cn(
                'truncate text-sm leading-snug',
                !(isProgress && loadingStyle === 'dots') && 'mt-0.5',
              )}
              title={item.message}
            >
              {item.message}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(item.id)}
          className="feedback-dismiss -mr-0.5 shrink-0 rounded-md p-1 opacity-60 transition-opacity hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
          aria-label="Dismiss"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
            <path
              fill="currentColor"
              d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L8.94 10l-4.72 4.72a.75.75 0 1 0 1.06 1.06L10 11.06l4.72 4.72a.75.75 0 1 0 1.06-1.06L11.06 10l4.72-4.72a.75.75 0 0 0-1.06-1.06L10 8.94 5.28 4.22Z"
            />
          </svg>
        </button>
      </div>
      {showProgressBar && (
        <div className="px-3.5 pb-3.5">
          <div className="flex items-center justify-between gap-2 pb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide opacity-80">
              {hasDeterminateProgress ? 'Uploading' : 'Preparing upload'}
            </span>
            {hasDeterminateProgress && (
              <span className="text-[11px] tabular-nums opacity-80">{Math.round(progressValue)}%</span>
            )}
          </div>
          <div className="feedback-progress-track h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            {hasDeterminateProgress ? (
              <div
                className="feedback-progress-fill h-full rounded-full bg-current transition-[width] duration-300 ease-out"
                style={{ width: `${progressValue}%` }}
              />
            ) : (
              <div className="feedback-progress-indeterminate h-full w-2/5 rounded-full bg-current" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FeedbackViewport({
  items,
  onDismiss,
}: {
  items: FeedbackItem[];
  onDismiss: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="pointer-events-none fixed right-4 bottom-4 z-[100] flex flex-col-reverse gap-2.5"
    >
      {items.map((item) => (
        <FeedbackToast key={item.id} item={item} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

const FeedbackContext = createContext<FeedbackAPI | null>(null);

function useFeedbackReducer() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const scheduleDismiss = useCallback(
    (item: FeedbackItem) => {
      clearTimer(item.id);
      if (item.duration === null) return;

      const timer = setTimeout(() => {
        setItems((prev) =>
          prev.map((entry) => (entry.id === item.id ? { ...entry, exiting: true } : entry)),
        );
        setTimeout(() => {
          setItems((prev) => prev.filter((entry) => entry.id !== item.id));
          timersRef.current.delete(item.id);
        }, 200);
      }, item.duration);

      timersRef.current.set(item.id, timer);
    },
    [clearTimer],
  );

  const dispatch = useCallback(
    (action: FeedbackAction) => {
      switch (action.type) {
        case 'add': {
          setItems((prev) => {
            const without = prev.filter((item) => item.id !== action.item.id);
            return [...without, action.item];
          });
          scheduleDismiss(action.item);
          break;
        }
        case 'update': {
          let merged: FeedbackItem | undefined;
          setItems((prev) =>
            prev.map((item) => {
              if (item.id !== action.id) return item;
              merged = { ...item, ...action.patch, exiting: false };
              return merged;
            }),
          );
          if (merged) scheduleDismiss(merged);
          break;
        }
        case 'exit': {
          setItems((prev) =>
            prev.map((item) => (item.id === action.id ? { ...item, exiting: true } : item)),
          );
          break;
        }
        case 'remove': {
          clearTimer(action.id);
          setItems((prev) => prev.filter((item) => item.id !== action.id));
          break;
        }
        case 'dismiss': {
          clearTimer(action.id);
          setItems((prev) =>
            prev.map((item) => (item.id === action.id ? { ...item, exiting: true } : item)),
          );
          setTimeout(() => {
            setItems((prev) => prev.filter((item) => item.id !== action.id));
          }, 200);
          break;
        }
        case 'dismiss-all': {
          timersRef.current.forEach((timer) => clearTimeout(timer));
          timersRef.current.clear();
          setItems([]);
          break;
        }
      }
    },
    [clearTimer, scheduleDismiss],
  );

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    },
    [],
  );

  return { items, dispatch };
}

function createFeedbackAPI(dispatch: (action: FeedbackAction) => void): FeedbackAPI {
  const add = (
    type: FeedbackType,
    message: string,
    options?: FeedbackOptions & { progress?: number; loadingStyle?: ProgressLoadingStyle },
  ) => {
    const id = options?.id ?? createId();
    const item: FeedbackItem = {
      id,
      type,
      message,
      title: options?.title,
      progress: options?.progress,
      loadingStyle: options?.loadingStyle,
      duration: options?.duration ?? DEFAULT_DURATIONS[type],
      createdAt: Date.now(),
    };
    dispatch({ type: 'add', item });
    return id;
  };

  return {
    success: (message, options) => add('success', message, options),
    failure: (message, options) => add('failure', message, options),
    error: (message, options) => add('error', message, options),
    progress: (message, options) => add('progress', message, options),
    update: (id, patch) => dispatch({ type: 'update', id, patch }),
    dismiss: (id) => dispatch({ type: 'dismiss', id }),
    dismissAll: () => dispatch({ type: 'dismiss-all' }),
  };
}

export const feedback: FeedbackAPI = {
  success: (message, options) => {
    if (!globalDispatch) return createId();
    return createFeedbackAPI(globalDispatch).success(message, options);
  },
  failure: (message, options) => {
    if (!globalDispatch) return createId();
    return createFeedbackAPI(globalDispatch).failure(message, options);
  },
  error: (message, options) => {
    if (!globalDispatch) return createId();
    return createFeedbackAPI(globalDispatch).error(message, options);
  },
  progress: (message, options) => {
    if (!globalDispatch) return createId();
    return createFeedbackAPI(globalDispatch).progress(message, options);
  },
  update: (id, patch) => globalDispatch?.({ type: 'update', id, patch }),
  dismiss: (id) => globalDispatch?.({ type: 'dismiss', id }),
  dismissAll: () => globalDispatch?.({ type: 'dismiss-all' }),
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const { items, dispatch } = useFeedbackReducer();
  const api = useMemo(() => createFeedbackAPI(dispatch), [dispatch]);

  useEffect(() => {
    globalDispatch = dispatch;
    return () => {
      globalDispatch = null;
    };
  }, [dispatch]);

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      <FeedbackViewport items={items} onDismiss={api.dismiss} />
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackAPI {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within FeedbackProvider');
  }
  return context;
}
