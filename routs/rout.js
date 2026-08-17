const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const {
  buyerConfirmDeclineService,
  sellerConfirmDeclineService,
  declineItemService,
  adminDeclineItemService,
} = require('../services/declineItem.js');
const { addCoinsService, creditStarsPaymentService } = require('../services/coinsService');
const bot = require('../bot.js');
const { checkUserService } = require("../services/CheckUser.js");
const { getUserFavouritesService } = require('../services/getUserFavourites.js');
const { getUserItemsService } = require('../services/getUserItems.js');
const { updateItemService } = require("../services/UpdateItemService.js");
const { getOperations } = require('../services/OperationsService.js');
const { getPaymentService } = require("../services/getPayment.js");
const { buyerConfirmService, sellerConfirmService } = require('../services/confirmItemService.js');
const { confirmItemService } = require('../services/confirmItem.js');
const { payoutService, getPayoutsListService, nextPayoutService, getUserPayoutsService } = require("../services/payoutService.js");
const { deleteNotificationService } = require('../services/deleteNotification.js');
const { registerUserService } = require("../services/RegisterService.js");
const { uploadItemService } = require("../services/uploadItem.js");
const { getItemService } = require("../services/getItem.js");
const { editItemService } = require("../services/editItem.js");
const { deleteItemService } = require("../services/deleteItem.js");
const { rateItemService } = require('../services/rateItemService.js');
const { buyItemService } = require("../services/buyItem.js");
const { banUserService, unbanUserService } = require("../services/banUser.js");
const { getItemsService } = require("../services/getItemsService.js");
const { getUnActiveItemsService } = require("../services/getUnActive.js");
const { sendNotificationService } = require("../services/SendNotification.js");
const { toggleFavouriteService } = require("../services/AddFavorite.js");
const { approveItemService } = require("../services/approveItem.js");
const { message } = require('../src/db/schema.js');
const { db } = require('../db.js');
const { eq } = require('drizzle-orm');
const { users } = require('../src/db/schema.js');
const { requireTelegramAuth } = require("../services/middlewares/telegramAuth.js");
const { requireAdmin } = require("../services/middlewares/requireAdmin.js");
const { isSelfOrAdmin } = require("../services/middlewares/isSelfOrAdmin.js");
const { requireAdmin } = require("../middleware/requireAdmin.js");
const { isSelfOrAdmin } = require("../middleware/isSelfOrAdmin.js");
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "error", message: "Слишком много запросов, попробуйте позже" },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Слишком много попыток регистрации, попробуйте позже" },
});

const moneyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Слишком много операций с балансом, попробуйте позже" },
});

const adminActionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Слишком много административных действий, попробуйте позже" },
});

const notificationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "error", message: "Слишком много уведомлений, попробуйте позже" },
});

router.use(generalLimiter);

// ------------------------------------
// PUBLIC ROUTES (no auth required — registration is the auth entry point,
// item browsing is meant to be public)
// ------------------------------------

router.post("/register", registerLimiter, async (req, res) => {
  try {
    const result = await registerUserService(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// NOTE: this still trusts req.body entirely (no auth). If items should only
// ever be created by the authenticated seller, consider adding
// requireTelegramAuth here and forcing sellerId = req.telegramUser.id,
// the same way /editItem and /deleteItem now do it below.
router.post("/uploadItem", async (req, res) => {
  try {
    const newItem = await uploadItemService(req.body);
    return res.status(201).json({ success: true, data: newItem });
  } catch (error) {
    if (error?.message === "All fields are required") {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error uploading item:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get('/operations/:userId', async (req, res) => {
  try {
    const data = await getOperations(req.params.userId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getSellerOperations:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

router.get('/getpayment/:id', async (req, res) => {
  try {
    const data = await getPaymentService(req.params.id);
    res.status(200).json({ status: "success", data });
  } catch (e) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

router.get("/getItems", async (req, res) => {
  try {
    const data = await getItemsService();
    if (data && data.length > 0) {
      res.status(200).json({ status: "success", data });
    } else {
      res.status(200).json({ status: "error", message: "Нет товаров. Повторите позже" });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: "error", message: `Error: ${e}` });
  }
});

router.get("/getItem/:id", async (req, res) => {
  try {
    const item = await getItemService(req.params.id);
    if (!item) return res.status(404).json({ error: "Item not found" });
    return res.status(200).json(item);
  } catch (error) {
    if (error.message === "Item ID is required") {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error fetching item:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ------------------------------------
// PROTECTED ROUTES (secured version — auth required, IDs forced from the
// verified Telegram identity, never trusted from the client body/params)
// ------------------------------------

router.get("/checkUser/:telegramId", requireTelegramAuth, async (req, res) => {
  try {
    if (!(await isSelfOrAdmin(req, req.params.telegramId))) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }
    const result = await checkUserService(req.params.telegramId);
    if (!result) return res.status(404).json({ error: "User not found" });
    res.status(200).json(result);
  } catch (error) {
    if (error.message.startsWith('Вы забанены на нашей')) {
      return res.status(403).json({ error: error.message });
    }
    console.error('checkUser error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch("/payout/next/:id", requireTelegramAuth, requireAdmin, async (req, res) => {
  try {
    const result = await nextPayoutService(req.params.id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error.message === "Payout not found") {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === "Payout ID is required") {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error updating payout:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/payout/user/:userId", requireTelegramAuth, async (req, res) => {
  try {
    if (!(await isSelfOrAdmin(req, req.params.userId))) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }
    const result = await getUserPayoutsService(req.params.userId);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    if (error.message === "User ID is required") {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error fetching user payouts:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/sendNotification", notificationLimiter, requireTelegramAuth, async (req, res) => {
  try {
    const { title, description, to } = req.body;
    // `from` is forced to the authenticated user, never trusted from the body.
    const result = await sendNotificationService(req.telegramUser.id, title, description, to);
    res.status(200).json({ status: "success", message: "user notified", data: result });
  } catch (e) {
    res.status(500).json({ status: "error", message: e.message || String(e) });
  }
});

router.get("/getUnActive", requireTelegramAuth, requireAdmin, async (req, res) => {
  try {
    const result = await getUnActiveItemsService();
    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.post("/deleteItem", requireTelegramAuth, async (req, res) => {
  try {
    const rawId = req.body?.id;
    const reason = req.body?.reason;
    const item = await getItemService(rawId);
    if (!item) return res.status(404).json({ error: "Item not found" });
    const owns = String(item.sellerId) === req.telegramUser.id;
    if (!owns && !(await isSelfOrAdmin(req, req.telegramUser.id))) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }
    const result = await deleteItemService(rawId, reason);
    return res.status(200).json({ success: true, message: "Item deleted successfully", data: result });
  } catch (error) {
    if (error.message === "Item ID is required") return res.status(400).json({ error: error.message });
    if (error.message === "Item not found") return res.status(404).json({ error: error.message });
    console.error("Error deleting item:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get('/getMessages/:telegramId', requireTelegramAuth, async (req, res) => {
  try {
    if (!(await isSelfOrAdmin(req, req.params.telegramId))) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }
    const messages = await db
      .select()
      .from(message)
      .where(eq(message.to, req.params.telegramId))
      .orderBy(message.createdAt);
    return res.status(200).json(messages ?? []);
  } catch (error) {
    return res.status(500).json({ error: `${error}` });
  }
});

router.patch("/uploadItem", requireTelegramAuth, async (req, res) => {
  try {
    const { id, ...rest } = req.body;
    const item = await getItemService(id);
    if (!item) return res.status(404).json({ error: "Item not found" });
    const owns = String(item.sellerId) === req.telegramUser.id;
    if (!owns && !(await isSelfOrAdmin(req, req.telegramUser.id))) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }
    // Never allow the client to reassign ownership of an item.
    delete rest.sellerId;
    const updatedItem = await updateItemService(id, rest);
    return res.status(200).json({ success: true, data: updatedItem });
  } catch (error) {
    console.error("Error updating item:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

router.patch('/approveItem/:id', adminActionLimiter, requireTelegramAuth, requireAdmin, async (req, res) => {
  try {
    const itemId = Number(req.params.id);
    if (isNaN(itemId)) return res.status(400).json({ status: "error", message: "Некорректный ID товара" });
    const result = await approveItemService(itemId);
    return res.status(200).json({ status: "success", message: "Товар успешно одобрен", data: result.item });
  } catch (error) {
    console.error(`Ошибка в роутере approveItem: ${error.message}`);
    return res.status(500).json({ status: "error", message: error.message || "Внутренняя ошибка сервера" });
  }
});

router.post('/togglefavourite', requireTelegramAuth, async (req, res) => {
  try {
    const { itemId } = req.body;
    // userTelegramId is forced to the authenticated user.
    const result = await toggleFavouriteService(req.telegramUser.id, itemId);
    res.status(200).json({ message: "Toggled", action: result.action, data: result.data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/buyItem", moneyLimiter, requireTelegramAuth, async (req, res) => {
  try {
    // buyerId is forced to the authenticated user — the client can never buy
    // on behalf of someone else or make someone else pay.
    const result = await buyItemService({ ...req.body, buyerId: req.telegramUser.id });
    return res.status(200).json({ success: true, message: "Item purchased (money locked in escrow)", data: result });
  } catch (error) {
    if (error.message === "Insufficient balance" || error.message === "Item is not active") {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === "Item not found" || error.message === "User not found") {
      return res.status(404).json({ error: error.message });
    }
    console.error("Error buying item:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// DANGER: this endpoint mints balance out of thin air. It must never be
// reachable by an ordinary authenticated user — only by an admin doing a
// manual correction, or (better) removed entirely in favor of crediting
// balance exclusively from the verified Telegram Stars payment webhook
// (see creditStarsPaymentService), which is driven by Telegram itself and
// not by a client-supplied amount.
router.patch("/addCash", moneyLimiter, requireTelegramAuth, requireAdmin, async (req, res) => {
  try {
    const { userId, amount } = req.body;
    const result = await addCoinsService(userId, amount);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/confirm/buyer', requireTelegramAuth, async (req, res) => {
  try {
    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ error: 'itemId is required' });
    const result = await buyerConfirmService({ itemId, buyerId: req.telegramUser.id });
    return res.status(200).json({ success: true, payment: result });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/confirm/seller', requireTelegramAuth, async (req, res) => {
  try {
    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ error: 'itemId is required' });
    const result = await sellerConfirmService({ itemId, sellerId: req.telegramUser.id });
    return res.status(200).json({ success: true, payment: result });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/confirm/complete', requireTelegramAuth, async (req, res) => {
  try {
    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ error: 'itemId is required' });
    // sellerId is forced to the authenticated user; the service should also
    // independently verify this matches the item's actual seller.
    const result = await confirmItemService({ itemId, sellerId: req.telegramUser.id });
    return res.status(200).json({ success: true, item: result });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.get('/getUserFavourites/:id', requireTelegramAuth, async (req, res) => {
  try {
    if (!(await isSelfOrAdmin(req, req.params.id))) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }
    const response = await getUserFavouritesService(req.params.id);
    return res.status(200).json(response);
  } catch (error) {
    console.error('Router error:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.get('/getUserItems/:id', async (req, res) => {
  try {
    // Publicly listing a seller's active items is fine (needed for public
    // profile pages) — getUserItemsService should only return public/active
    // listings here, not drafts, balances, or other private fields.
    const { id } = req.params;
    const response = await getUserItemsService(id);
    res.status(200).json({ status: "success", data: response });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.post('/deleteNotification', requireTelegramAuth, async (req, res) => {
  try {
    const { notificationId } = req.body;
    const numericId = Number(notificationId);
    // deleteNotificationService should verify the notification belongs to
    // req.telegramUser.id before deleting; pass it through explicitly.
    await deleteNotificationService(numericId, req.telegramUser.id);
    res.status(200).json({ status: "success" });
  } catch (e) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

router.patch("/editItem", requireTelegramAuth, async (req, res) => {
  try {
    const item = await getItemService(req.body?.id);
    if (!item) return res.status(404).json({ error: "Item not found" });
    const owns = String(item.sellerId) === req.telegramUser.id;
    if (!owns && !(await isSelfOrAdmin(req, req.telegramUser.id))) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }
    const body = { ...req.body };
    delete body.sellerId; // never allow reassigning ownership via edit
    const updatedData = await editItemService(body);
    return res.status(200).json({ success: true, data: updatedData });
  } catch (error) {
    if (
      error.message === "Item ID is required" ||
      error.message === "At least one field must be provided for update"
    ) return res.status(400).json({ error: error.message });
    if (error.message === "Item Found" || error.message === "Item not found") {
      return res.status(404).json({ error: error.message });
    }
    console.error("Error editing item:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

const MAX_PAYOUT = 5000;
router.post("/requestPayout", moneyLimiter, requireTelegramAuth, async (req, res) => {
  try {
    // userId is forced to the authenticated user — you can only ever request
    // a payout of your own balance to your own configured wallet.
    const result = await payoutService({ ...req.body, userId: req.telegramUser.id });
    return res.status(200).json({ success: true, newBalance: result.newBalance, wallet: result.wallet });
  } catch (error) {
    const badRequestErrors = [
      "User ID and amount are required",
      "Invalid payout amount",
      "Insufficient balance",
      "User has no wallet configured. Please add a payout wallet first.",
      `Payout amount exceeds the maximum limit of ${MAX_PAYOUT} rubles`,
    ];
    if (badRequestErrors.includes(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === "User not found" || error.message === "User not found during update") {
      return res.status(404).json({ error: error.message });
    }
    console.error("Error processing payout request:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/payoutList", requireTelegramAuth, requireAdmin, async (req, res) => {
  try {
    const { payouts, stats } = await getPayoutsListService();
    return res.status(200).json({ success: true, payouts, stats });
  } catch (error) {
    console.error("Error fetching payout options:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post('/ban/:telegramId', adminActionLimiter, requireTelegramAuth, requireAdmin, async (req, res) => {
  try {
    const result = await banUserService(req.params.telegramId, req.body);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/unban/:telegramId', adminActionLimiter, requireTelegramAuth, requireAdmin, async (req, res) => {
  try {
    const result = await unbanUserService(req.params.telegramId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/rate', requireTelegramAuth, async (req, res) => {
  try {
    const { ratedId, itemId, description, ratingValue } = req.body;
    // raterId is forced to the authenticated user — no fake reviews as
    // someone else.
    const result = await rateItemService({
      raterId: req.telegramUser.id,
      ratedId,
      itemId,
      description,
      ratingValue,
    });
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/decline/buyer', requireTelegramAuth, async (req, res) => {
  try {
    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ error: 'itemId is required' });
    const result = await buyerConfirmDeclineService({ itemId, buyerId: req.telegramUser.id });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/decline/seller', requireTelegramAuth, async (req, res) => {
  try {
    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ error: 'itemId is required' });
    const result = await sellerConfirmDeclineService({ itemId, sellerId: req.telegramUser.id });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/decline/complete', requireTelegramAuth, async (req, res) => {
  try {
    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ error: 'itemId is required' });
    const result = await declineItemService({ itemId });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/decline/admin', adminActionLimiter, requireTelegramAuth, requireAdmin, async (req, res) => {
  try {
    const { itemId, reason } = req.body;
    if (!itemId) return res.status(400).json({ error: 'itemId is required' });
    const result = await adminDeclineItemService({ itemId, adminId: req.telegramUser.id, reason });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/createStarsInvoice', moneyLimiter, requireTelegramAuth, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!Number.isInteger(amount) || amount < 1) {
      return res.status(400).json({ error: 'Некорректные параметры' });
    }

    const payload = JSON.stringify({ userId: req.telegramUser.id, coins: amount });

    const invoiceLink = await bot.createInvoiceLink(
      'Пополнение баланса',
      `Начисление ${amount} коинов`,
      payload,
      '',
      'XTR',
      [{ label: 'Коины', amount }],
    );

    res.json({ invoiceLink });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
