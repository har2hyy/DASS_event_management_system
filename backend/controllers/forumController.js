const Message = require('../models/Message');
const Event   = require('../models/Event');

// In-memory SSE client registry  { eventId: Set<res> }
const sseClients = {};

function broadcastToEvent(eventId, data) {
  const clients = sseClients[eventId];
  if (!clients) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    res.write(payload);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// @route  GET /api/forum/:eventId/stream
// @access Private — SSE stream
// ─────────────────────────────────────────────────────────────────────────────
exports.sseStream = async (req, res) => {
  const eventId = req.params.eventId;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(':\n\n'); // initial keep-alive comment

  if (!sseClients[eventId]) sseClients[eventId] = new Set();
  sseClients[eventId].add(res);

  // Heartbeat every 30s
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients[eventId]?.delete(res);
    if (sseClients[eventId]?.size === 0) delete sseClients[eventId];
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  GET /api/forum/:eventId/messages
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
exports.getMessages = async (req, res) => {
  try {
    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const messages = await Message.find({ event: req.params.eventId, deleted: false })
      .populate('author', 'firstName lastName organizerName role email')
      .populate('parentMessage', 'content author')
      .sort({ pinned: -1, createdAt: 1 })
      .skip((pageNum - 1) * limit)
      .limit(limit);

    const total = await Message.countDocuments({ event: req.params.eventId, deleted: false });
    res.json({ success: true, messages, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  POST /api/forum/:eventId/messages
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
exports.postMessage = async (req, res) => {
  try {
    const { content, parentMessage } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const msg = await Message.create({
      event: event._id,
      author: req.user._id,
      authorRole: req.user.role,
      content: content.trim().slice(0, 2000),
      parentMessage: parentMessage || null,
    });

    const populated = await Message.findById(msg._id)
      .populate('author', 'firstName lastName organizerName role email')
      .populate('parentMessage', 'content author');

    broadcastToEvent(event._id.toString(), { type: 'new_message', message: populated });

    res.status(201).json({ success: true, message: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  PUT /api/forum/:eventId/messages/:msgId/pin
// @access Private (Organizer who owns event)
// ─────────────────────────────────────────────────────────────────────────────
exports.togglePin = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (req.user.role !== 'Admin' && event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the event organizer can pin messages' });
    }

    const msg = await Message.findById(req.params.msgId);
    if (!msg || msg.event.toString() !== event._id.toString()) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    msg.pinned = !msg.pinned;
    await msg.save();

    const populated = await Message.findById(msg._id)
      .populate('author', 'firstName lastName organizerName role email');
    broadcastToEvent(event._id.toString(), { type: 'pin_toggle', message: populated });

    res.json({ success: true, message: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  DELETE /api/forum/:eventId/messages/:msgId
// @access Private (author or organizer)
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteMessage = async (req, res) => {
  try {
    const msg = await Message.findById(req.params.msgId);
    if (!msg || msg.event.toString() !== req.params.eventId) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const event = await Event.findById(req.params.eventId);
    const isAuthor = msg.author.toString() === req.user._id.toString();
    const isEventOrganizer = event && event.organizer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'Admin';

    if (!isAuthor && !isEventOrganizer && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    msg.deleted = true;
    msg.content = '[deleted]';
    await msg.save();

    broadcastToEvent(req.params.eventId, { type: 'delete_message', messageId: msg._id });

    res.json({ success: true, message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  PUT /api/forum/:eventId/messages/:msgId/react
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
exports.reactToMessage = async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ success: false, message: 'emoji is required' });

    const allowedEmojis = ['👍', '❤️', '😂', '🎉', '🔥', '👎'];
    if (!allowedEmojis.includes(emoji)) {
      return res.status(400).json({ success: false, message: 'Invalid emoji' });
    }

    const msg = await Message.findById(req.params.msgId);
    if (!msg || msg.event.toString() !== req.params.eventId) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const users = msg.reactions.get(emoji) || [];
    const idx = users.findIndex((u) => u.toString() === req.user._id.toString());
    if (idx >= 0) {
      users.splice(idx, 1);
    } else {
      users.push(req.user._id);
    }
    msg.reactions.set(emoji, users);
    await msg.save();

    broadcastToEvent(req.params.eventId, {
      type: 'reaction',
      messageId: msg._id,
      emoji,
      count: users.length,
    });

    res.json({ success: true, reactions: Object.fromEntries(msg.reactions) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
