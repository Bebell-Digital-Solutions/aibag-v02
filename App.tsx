
import React, { useState, useEffect, useCallback } from 'react';
import { Message, MessageSender, UploadedFile } from './types';
import { streamChatResponse, resetChat } from './services/geminiService';

import Header from './components/Header';
import ChatView from './components/ChatView';
import TypingArea from './components/TypingArea';
import FileUploadModal from './components/FileUploadModal';

const App: React.FC = () => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("mega-bot-theme");
    return savedTheme === 'light' || savedTheme === 'dark' 
      ? savedTheme 
      : window.matchMedia?.('(prefers-color-scheme: dark)').matches 
        ? 'dark' 
        : 'light';
  });
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFileModalOpen, setFileModalOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  
  const isApiConfigured = !!process.env.API_KEY;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('mega-bot-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  }, []);

  const handleSendMessage = useCallback(async (inputText: string) => {
    if (!inputText.trim() || isLoading || !isApiConfigured) return;

    setIsLoading(true);
    const userMessage: Message = { id: Date.now(), sender: MessageSender.USER, text: inputText };
    const botMessageId = Date.now() + 1;
    const botMessage: Message = { id: botMessageId, sender: MessageSender.BOT, text: '', isError: false };
    
    setMessages(prev => [...prev, userMessage, botMessage]);
    
    try {
      const fileContext = uploadedFiles.map(f => `File: ${f.name}\nContent:\n${f.content}`).join('\n\n');
      const stream = await streamChatResponse(messages, inputText, fileContext);
      
      let fullResponse = '';
      for await (const chunk of stream) {
        fullResponse += chunk;
        setMessages(prev => prev.map(msg => 
          msg.id === botMessageId 
            ? { ...msg, text: fullResponse } 
            : msg
        ));
      }
    } catch (error) {
      console.error('API Error:', error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setMessages(prev => prev.map(msg => 
        msg.id === botMessageId 
          ? { ...msg, text: `Error: ${errorMessage}`, isError: true } 
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isApiConfigured, messages, uploadedFiles]);

  const handleDeleteChat = useCallback(() => {
    if (messages.length > 0 && window.confirm("Are you sure you want to delete the chat history?")) {
      setMessages([]);
      setUploadedFiles([]);
      resetChat();
    }
  }, [messages.length]);

  return (
    <div className="flex flex-col h-screen max-h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      {messages.length === 0 ? (
        <Header onSuggestionClick={handleSendMessage} />
      ) : (
        <ChatView messages={messages} />
      )}
      
      <TypingArea
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        theme={theme}
        toggleTheme={toggleTheme}
        onDeleteChat={handleDeleteChat}
        onOpenUploadModal={() => setFileModalOpen(true)}
        isApiConfigured={isApiConfigured}
        uploadedFilesCount={uploadedFiles.length}
      />
      
      {isFileModalOpen && (
        <FileUploadModal
          uploadedFiles={uploadedFiles}
          setUploadedFiles={setUploadedFiles}
          onClose={() => setFileModalOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
