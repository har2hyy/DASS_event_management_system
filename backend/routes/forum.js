const express = require('express');
const router = express.Router();
const {
  sseStream, getMessages, postMessage,
  togglePin, deleteMessage, reactToMessage,
} = require('../controllers/forumController');
const { protect } = require('../middleware/auth');

router.get('/:eventId/stream',                     protect, sseStream);
router.get('/:eventId/messages',                    protect, getMessages);
router.post('/:eventId/messages',                   protect, postMessage);
router.put('/:eventId/messages/:msgId/pin',         protect, togglePin);
router.delete('/:eventId/messages/:msgId',          protect, deleteMessage);
router.put('/:eventId/messages/:msgId/react',       protect, reactToMessage);

module.exports = router;
