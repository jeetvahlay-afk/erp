const express = require('express');
const {
  listConversations, createConversation, listMessages, sendMessage, deleteMessage, reactToMessage,
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/chatUploadMiddleware');

const router = express.Router();
router.use(protect);

router.get('/conversations', listConversations);
router.post('/conversations', createConversation);
router.get('/conversations/:id/messages', listMessages);
router.post('/conversations/:id/messages', upload.single('file'), sendMessage);
router.delete('/conversations/:id/messages/:msgId', deleteMessage);
router.post('/conversations/:id/messages/:msgId/react', reactToMessage);

module.exports = router;
