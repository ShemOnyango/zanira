import logger from './logger.js';

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = {
      message,
      statusCode: 404,
      isOperational: true
    };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `${field} '${value}' is already taken. Please use a different ${field}.`;
    error = {
      message,
      statusCode: 400,
      isOperational: true
    };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => val.message);
    const message = `Invalid input data: ${errors.join('. ')}`;
    error = {
      message,
      statusCode: 400,
      isOperational: true
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token. Please log in again.';
    error = {
      message,
      statusCode: 401,
      isOperational: true
    };
  }

  // JWT expired
  if (err.name === 'TokenExpiredError') {
    const message = 'Your token has expired. Please log in again.';
    error = {
      message,
      statusCode: 401,
      isOperational: true
    };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export default errorHandler;