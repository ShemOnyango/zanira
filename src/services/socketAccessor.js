// A tiny accessor to store/retrieve the SocketService instance
// This avoids sprinkling `global` usage across services and makes the
// socket instance injectable from server startup.
let _socketService = null;

export const setSocketService = (service) => {
  _socketService = service;
};

export const getSocketService = () => _socketService;

export default {
  setSocketService,
  getSocketService
};
