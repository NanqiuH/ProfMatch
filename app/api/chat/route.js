'use client';

import { Box, Button, CircularProgress, Stack, TextField, Typography, Card, CardContent } from '@mui/material';
import { useState, useRef, useEffect } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';

// Custom theme creation with a primary and secondary color palette and typography settings
const theme = createTheme({
  palette: {
    primary: {
      main: '#3f51b5', // Primary color used in the application
    },
    secondary: {
      main: '#f50057', // Secondary accent color
    },
  },
  typography: {
    h3: {
      fontSize: '2.5rem',
      fontWeight: 700,
    },
    subtitle1: {
      fontSize: '1.25rem',
      color: '#6c757d',
    },
  },
});

/**
 * Formats a Date object to a time string in 'hh:mm:ss' format
 * @param {Date} date - The date object to format
 * @returns {string} - The formatted time string or an empty string if no date is provided
 */
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

/**
 * Cleans up the content of a message by removing certain characters
 * and formatting it for better readability.
 * @param {string} content - The raw content of the message
 * @returns {string} - The cleaned and formatted message content
 */
const cleanUpMessageContent = (content) => {
  let cleanedContent = content.replace(/\*\*/g, '');
  cleanedContent = cleanedContent.replace(/(Name:|Department:|Rating:|Summary:|Additional Guidance:)/g, '\n$1');
  return cleanedContent.trim();
};

/**
 * Validates if a string is a properly formatted URL
 * @param {string} string - The string to validate
 * @returns {boolean} - True if the string is a valid URL, false otherwise
 */
const isValidURL = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

/**
 * The main component of the application that renders the ProfMatch AI interface
 */
export default function Home() {
  // State management using React's useState hook
  const [messages, setMessages] = useState([]); // Stores the chat messages
  const [message, setMessage] = useState(''); // Stores the current user input
  const [isLoading, setIsLoading] = useState(false); // Tracks the loading state
  const [url, setUrl] = useState(''); // Stores the URL input by the user
  const [error, setError] = useState(''); // Stores any error messages

  // useEffect hook to initialize the chat with a welcome message from the assistant
  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: "Hi! I'm the ProfMatch assistant. How can I help you today?",
        timestamp: new Date(),
      },
    ]);
  }, []);

  /**
   * Handles the submission of a URL to the server for scraping
   * Validates the URL and makes a POST request to the backend
   */
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

  /**
   * Handles sending the user's message to the assistant
   * Sends the message to the backend and updates the messages list
   */
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

  /**
   * Handles the key press event for the message input field
   * Sends the message if Enter is pressed without the Shift key
   * @param {object} event - The key press event object
   */
  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  // Reference to the end of the messages container to scroll into view
  const messagesEndRef = useRef(null);

  /**
   * Scrolls the messages container to the bottom
   * Ensures the most recent message is visible
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // useEffect to scroll to the bottom every time a new message is added
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // JSX for rendering the UI components
  return (
    <ThemeProvider theme={theme}>
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
        {/* Header section with title and subtitle */}
        <Box
          width={{ xs: '100%', sm: '80%', md: '60%', lg: '50%' }}
          textAlign="center"
          mt={2}
          mb={2}
        >
          <Typography variant="h3" color="primary" gutterBottom>
            ProfMatch AI
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Ask about professors or submit a URL to save professor information.
          </Typography>
        </Box>

        {/* Chat container where messages are displayed */}
        <Stack
          direction={'column'}
          width={{ xs: '100%', sm: '80%', md: '60%', lg: '50%' }}
          height="65vh"
          bgcolor="white"
          borderRadius={4}
          boxShadow="0 4px 12px rgba(0, 0, 0, 0.1)"
          p={2}
          spacing={2}
          overflow="auto"
        >
          {messages.map((message, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: message.role === 'assistant' ? 'flex-start' : 'flex-end',
                mb: 2,
              }}
            >
              {/* Timestamp and role indicator */}
              <Typography
                variant="caption"
                color="textSecondary"
                sx={{
                  marginBottom: '4px',
                  textAlign: message.role === 'assistant' ? 'left' : 'right',
                  width: '100%',
                }}
              >
                {message.role === 'assistant' ? `ProfMatch Assistant` : 'You'} | {formatDate(message.timestamp)}
              </Typography>

              {/* Message content */}
              <Box
                bgcolor={message.role === 'assistant' ? '#e0e7ff' : 'primary.main'}
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

        {/* Error message display */}
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

        {/* Input field and send button for user messages */}
        <Stack
          direction={'row'}
          spacing={2}
          alignItems="center"
          width={{ xs: '100%', sm: '80%', md: '60%', lg: '50%' }}
          mt={2}
          mb={2}
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
                '&:hover': {
                  borderColor: '#3f51b5',
                },
                '&.Mui-focused': {
                  borderColor: '#3f51b5',
                },
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
                transform: 'scale(1.05)',
                transition: 'all 0.3s ease',
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

        {/* URL submission section */}
        <Box
          width={{ xs: '100%', sm: '80%', md: '60%', lg: '50%' }}
          textAlign="center"
          mt={1}
          mb={1}
        >
          <Typography variant="h5" color="textSecondary">
            If you want to save a professor into the database, submit the URL below
          </Typography>
        </Box>

        <Card
          variant="outlined"
          sx={{
            width: { xs: '100%', sm: '80%', md: '60%', lg: '50%' },
            mt: 1,
            borderRadius: 4,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)", 
            borderColor: '#d1d9e6',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: "0 6px 18px rgba(0, 0, 0, 0.2)",
            },
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
                    '&:hover': {
                      borderColor: '#3f51b5',
                    },
                    '&.Mui-focused': {
                      borderColor: '#3f51b5',
                    },
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
                Submit
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </ThemeProvider>
  );
}
