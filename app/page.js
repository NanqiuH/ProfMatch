'use client';

import { Box, Button, CircularProgress, Stack, TextField, Typography, Card, CardContent } from '@mui/material';
import { useState, useRef, useEffect } from 'react';

const formatDate = (date) => {
  if (!date) return ''; 
  const options = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };
  return date.toLocaleTimeString([], options);
};

const cleanUpMessageContent = (content) => {
  let cleanedContent = content.replace(/\*\*/g, '');
  cleanedContent = cleanedContent.replace(/(Name:|Department:|Rating:|Summary:|Additional Guidance:)/g, '\n$1');
  return cleanedContent.trim();
};

const isValidURL = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: "Hi! I'm the ProfMatch assistant. How can I help you today?",
        timestamp: new Date(),
      },
    ]);
  }, []);

  const handleURLSubmit = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl || !isValidURL(trimmedUrl)) {
      setError('Please enter a valid URL.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages((messages) => [
          ...messages,
          {
            role: 'assistant',
            content: 'The data has been successfully scraped and saved.',
            timestamp: new Date(),
          },
        ]);
      } else {
        setError('Failed to scrape the data. Please try again.');
      }
    } catch (error) {
      console.error('Error during URL submission:', error);
      setError('An error occurred while processing your request.');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

    const newMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setMessage('');
    setError('');
    setMessages((messages) => [
      ...messages,
      newMessage,
      { role: 'assistant', content: '', timestamp: new Date() },
    ]);

    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([...messages, newMessage]),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let result = '';

      await reader.read().then(function processText({ done, value }) {
        if (done) {
          return result;
        }
        const text = decoder.decode(value || new Uint8Array(), { stream: true });
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1];
          let otherMessages = messages.slice(0, messages.length - 1);
          return [
            ...otherMessages,
            { ...lastMessage, content: lastMessage.content + text },
          ];
        });
        return reader.read().then(processText);
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setError('An error occurred while sending your message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="flex-start"
      bgcolor="#f4f7fc"
      p={2}
    >
      <Box
        width={{ xs: '100%', sm: '80%', md: '60%', lg: '50%' }}
        textAlign="center"
        mt={4}
        mb={2}
      >
        <Typography variant="h3" color="textPrimary" gutterBottom>
          ProfMatch AI
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Ask about professors or submit a URL to save professor information.
        </Typography>
      </Box>

      <Stack
        direction={'column'}
        width={{ xs: '100%', sm: '80%', md: '60%', lg: '50%' }}
        height="60vh" 
        bgcolor="white"
        borderRadius={4}
        boxShadow="0 4px 12px rgba(0, 0, 0, 0.1)" 
        p={3}
        spacing={2}
        overflow="auto"
      >
        {messages.map((message, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems:
                message.role === 'assistant' ? 'flex-start' : 'flex-end',
              mb: 2,
            }}
          >
            <Typography
              variant="caption"
              color="textSecondary"
              sx={{
                marginBottom: '4px',
                textAlign: message.role === 'assistant' ? 'left' : 'right',
                width: '100%', 
              }}
            >
              {message.role === 'assistant'
                ? `ProfMatch Assistant`
                : 'You'}{' '}
              | {formatDate(message.timestamp)}
            </Typography>

            <Box
              bgcolor={
                message.role === 'assistant'
                  ? '#e0e7ff'
                  : 'primary.main'
              }
              color={message.role === 'assistant' ? 'textPrimary' : 'white'}
              borderRadius={3}
              p={2}
              sx={{
                maxWidth: '75%',
                wordWrap: 'break-word',
                whiteSpace: 'pre-wrap',
              }}
            >
              <Typography variant="body1">
                {cleanUpMessageContent(message.content)}
              </Typography>
            </Box>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Stack>

      {error && (
        <Box
          width={{ xs: '100%', sm: '80%', md: '60%', lg: '50%' }}
          mt={2}
          p={2}
          bgcolor="error.main"
          color="white"
          borderRadius={2}
          textAlign="center"
        >
          <Typography variant="body1">{error}</Typography>
        </Box>
      )}

      <Stack
        direction={'row'}
        spacing={2}
        alignItems="center"
        width={{ xs: '100%', sm: '80%', md: '60%', lg: '50%' }}
        mt={2}
        mb={4} 
      >
        <TextField
          label="Ask about professors"
          fullWidth
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          variant="outlined"
          multiline
          rows={1}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '30px',
              backgroundColor: 'white',
              borderColor: '#d1d9e6',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#d1d9e6',
            },
          }}
        />
        <Button
          variant="contained"
          onClick={sendMessage}
          disabled={isLoading}
          sx={{
            minWidth: 60,
            minHeight: 55,
            borderRadius: '20%',
            bgcolor: '#4a90e2',
            color: 'white',
            '&:hover': {
              bgcolor: '#357abd',
            },
          }}
        >
          {isLoading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            'Send'
          )}
        </Button>
      </Stack>

      <Card
        variant="outlined"
        sx={{
          width: { xs: '100%', sm: '80%', md: '60%', lg: '50%' },
          mt: 2,
          borderRadius: 4,
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)", 
          borderColor: '#d1d9e6',
        }}
      >
        <CardContent>
          <Stack direction={'row'} spacing={2} alignItems="center">
            <TextField
              label="Professor's URL"
              fullWidth
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '30px',
                  backgroundColor: 'white',
                  borderColor: '#d1d9e6',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#d1d9e6',
                },
              }}
            />
            <Button
              variant="contained"
              onClick={handleURLSubmit}
              disabled={isLoading}
              sx={{
                borderRadius: '30px',
                bgcolor: '#4a90e2',
                color: 'white',
                '&:hover': {
                  bgcolor: '#357abd',
                },
                height: '56px', 
              }}
            >
              Submit URL
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
