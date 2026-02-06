import express from 'express';
import { feedController } from '../controllers/feedController.js';
import { notificationsController } from '../controllers/notificationsController.js';

const router = express.Router();

router.get('/feeds', feedController.getAllFeeds);
router.get('/feeds/by-category', feedController.getFeedsByCategory);
router.patch('/feeds/:feedId', feedController.updateFeedStatus);

router.get('/articles', feedController.getAllArticles);
router.post('/articles/refresh', feedController.refreshArticles);

router.post('/favorites/:articleId', feedController.toggleFavorite);
router.get('/favorites', feedController.getFavorites);
router.post('/read/:articleId', feedController.markAsRead);

router.get('/notifications/public-key', notificationsController.getPublicKey);
router.post('/notifications/subscribe', notificationsController.subscribe);
router.post('/notifications/unsubscribe', notificationsController.unsubscribe);
router.post('/notifications/test', notificationsController.sendTest);

export default router;
