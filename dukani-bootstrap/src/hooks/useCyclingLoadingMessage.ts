import { useState, useEffect } from 'react';

interface LoadingMessage {
  text: string;
  icon?: string;
  color?: string;
}

const defaultLoadingMessages: LoadingMessage[] = [
  { text: "Loading data..." },
  { text: "Fetching inventory..." },
  { text: "Syncing products..." },
  { text: "Updating categories..." },
  { text: "Loading customers..." },
  { text: "Preparing analytics..." },
  { text: "Checking stock levels..." },
  { text: "Connecting to database..." },
  { text: "Optimizing performance..." },
  { text: "Almost ready..." }
];

interface UseCyclingLoadingMessageOptions {
  messages?: LoadingMessage[];
  interval?: number;
  enabled?: boolean;
}

export const useCyclingLoadingMessage = (options: UseCyclingLoadingMessageOptions = {}) => {
  const {
    messages = defaultLoadingMessages,
    interval = 2000,
    enabled = true
  } = options;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentMessage, setCurrentMessage] = useState<LoadingMessage>(messages[0]);

  useEffect(() => {
    if (!enabled || messages.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % messages.length;
        setCurrentMessage(messages[nextIndex]);
        return nextIndex;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [messages, interval, enabled]);

  const reset = () => {
    setCurrentIndex(0);
    setCurrentMessage(messages[0]);
  };

  return {
    currentMessage,
    currentIndex,
    totalMessages: messages.length,
    reset
  };
};
