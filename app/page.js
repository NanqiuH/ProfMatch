'use client'
import { Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material'
import { useState, useRef, useEffect } from 'react'

// Function to format timestamp
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

// Function to clean and format the message content
const cleanUpMessageContent = (content) => {
  // Remove '**' from the content
  let cleanedContent = content.replace(/\*\*/g, '');

  // Ensure each section (Name, Department, etc.) starts on a new line
  cleanedContent = cleanedContent.replace(/(Name:|Department:|Rating:|Summary:|Additional Guidance:)/g, '\n$1');

  return cleanedContent.trim();
};

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: "Hi! I'm the ProfMatch assistant. How can I help you today?",
        timestamp: new Date(),
      },
    ]);
  }, []);

  const sendMessage = async () => {
    const newMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    
    setMessage('');
    setMessages((messages) => [
      ...messages,
      newMessage,
      { role: 'assistant', content: '', timestamp: new Date() },
    ]);
  
    const response = fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([...messages, newMessage]),
    }).then(async (res) => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let result = '';
  
      return reader.read().then(function processText({ done, value }) {
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
    });
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
      bgcolor="#f1f3f4"
    >
      {/* Title at the top left */}
      <Box
        width={{ xs: '90%', sm: '80%', md: '60%', lg: '40%' }}
        textAlign="left"
        mt={2}
        ml={2}
      >
        <Typography variant="h6" color="textPrimary">
          Chat with ProfMatch AI
        </Typography>
      </Box>

      {/* Chat interface */}
      <Stack
        direction={'column'}
        width={{ xs: '90%', sm: '80%', md: '60%', lg: '40%' }}
        height="85vh"
        bgcolor="white"
        borderRadius={2}
        boxShadow={3}
        p={2}
        mt={2} 
        spacing={3}
      >
        <Stack
          direction={'column'}
          spacing={2}
          flexGrow={1}
          overflow="auto"
          maxHeight="100%"
          sx={{ padding: '0 16px', boxSizing: 'border-box' }}
        >
          {messages.map((message, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems:
                  message.role === 'assistant' ? 'flex-start' : 'flex-end',
              }}
            >
              {/* Label and timestamp for each message */}
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
                  ? `ProfMatch Assistance`
                  : 'You'}{' '}
                | {formatDate(message.timestamp)}
              </Typography>

              {/* Message Bubble */}
              <Box
                display="flex"
                justifyContent={
                  message.role === 'assistant' ? 'flex-start' : 'flex-end'
                }
                width="100%"
              >
                <Box
                  bgcolor={
                    message.role === 'assistant'
                      ? 'primary.main'
                      : 'secondary.main'
                  }
                  color="white"
                  borderRadius={8}
                  p={2}
                  sx={{
                    maxWidth: '75%',
                    wordWrap: 'break-word',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  <Typography variant="body2">{cleanUpMessageContent(message.content)}</Typography>
                </Box>
              </Box>
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </Stack>
        <Stack direction={'row'} spacing={2} alignItems="center">
          <TextField
            label="Type a message"
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
                borderRadius: '50px',
              },
            }}
          />
          <Button
            variant="contained"
            onClick={sendMessage}
            disabled={isLoading}
            sx={{
              minWidth: 50,
              minHeight: 50,
              borderRadius: '50%',
            }}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Send'
            )}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
