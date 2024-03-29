const { Order } = require('../models/order');
const { OrderItem } = require('../models/order-item');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

router.get(`/`, async (req, res) => {
  const orderList = await Order.find()
    .populate('user', 'name')
    .sort({ dateOrdered: -1 });

  if (!orderList) {
    res.status(500).json({ success: false });
  }
  res.send(orderList);
});

router.get(`/get/usersorders/:userid`, async (req, res) => {
  const userOrderList = await Order.find({ user: req.params.userid })
    .populate('product', 'price')
    .sort({ dateOrdered: -1 });

  if (!userOrderList) {
    res.status(500).json({ success: false });
  }
  res.send(userOrderList);
});

router.get(`/:id`, async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name')
    .populate({
      path: 'orderItems',
      populate: { path: 'product', populate: 'category' },
    });

  if (!order) {
    res.status(500).json({ success: false });
  }
  res.send(order);
});

router.post('/', async (req, res) => {
  const orderItemsIds = Promise.all(
    req.body.orderItems.map(async (orderItem) => {
      let newOrderItem = new OrderItem({
        quantity: orderItem.quantity,
        product: orderItem.product,
      });

      newOrderItem = await newOrderItem.save();

      return newOrderItem._id;
    })
  );

  const orderItemsIdsResolved = await orderItemsIds;

  const totalPrices = await Promise.all(
    orderItemsIdsResolved.map(async (orderItemId) => {
      const orderItem = await OrderItem.findById(orderItemId).populate(
        'product',
        'price'
      );
      const totalPrice = orderItem.product.price * orderItem.quantity;
      return totalPrice;
    })
  );

  const total = totalPrices.reduce((a, b) => a + b, 0);

  let order = new Order({
    orderItems: orderItemsIdsResolved,
    shippingAddress1: req.body.shippingAddress1,
    shippingAddress2: req.body.shippingAddress2,
    city: req.body.city,
    zip: req.body.zip,
    country: req.body.country,
    phone: req.body.phone,
    status: req.body.status,
    totalPrice: total,
    user: req.body.user,
  });

  order = await order.save();
  if (!order) {
    return res.status(404).send('The order cannot be created!');
  }

  res.send(order);
});

router.put('/:id', async (req, res) => {
  const validId = mongoose.Types.ObjectId.isValid(req.params.id);
  if (!validId) {
    return res.status(500).json({ error: 'Invalid ID' });
  }

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    {
      status: req.body.status,
    },
    { new: true }
  );

  if (!order) {
    return res.status(404).json({ error: 'The order cannot be updated!' });
  }

  return res.send(order);
});

router.delete('/:id', (req, res) => {
  const validId = mongoose.Types.ObjectId.isValid(req.params.id);
  if (!validId) {
    return res.status(500).json({ error: 'Invalid ID' });
  }

  Order.findByIdAndRemove(req.params.id)
    .then(async (order) => {
      if (order) {
        await order.orderItems.map(async (orderItem) => {
          await OrderItem.findByIdAndRemove(orderItem);
        });
        return res
          .status(200)
          .json({ success: true, message: 'The order is deleted!' });
      } else {
        return res
          .status(404)
          .json({ success: false, message: 'Order not found!' });
      }
    })
    .catch((err) => {
      return res.status(400).json({ success: false, error: err });
    });
});

router.get('/get/totalsales', async (req, res) => {
  const totalsales = await Order.aggregate([
    { $group: { _id: null, totalsales: { $sum: '$totalPrice' } } },
  ]);

  if (!totalsales) {
    return res
      .status(400)
      .json({ error: 'The order sales cannot be generated!' });
  }

  return res.json({ totalsales: totalsales.pop().totalsales });
});

router.get('/get/count', async (req, res) => {
  const orderCount = await Order.countDocuments((count) => count);

  if (!orderCount) {
    return res.status(500).json({ success: false });
  }

  return res.send({ count: orderCount });
});

module.exports = router;
