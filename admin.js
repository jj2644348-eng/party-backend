const { handleGodAction } = require('./controllers/admin');

socket.on('god_mode_action', (data) => {
  handleGodAction(users, io, socket, data);
});

