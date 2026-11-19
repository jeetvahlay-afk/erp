const express = require('express');
const { listTasks, createTask, updateTask } = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router(); router.use(protect);
router.get('/', listTasks); router.post('/', createTask); router.patch('/:id', updateTask);
module.exports = router;
