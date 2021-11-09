const mongoose = require('mongoose');

const orderItemSchema = mongoose.Schema({
  quantity: {
    type: Number,
    required: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectID,
    ref: 'Product',
  },
});

exports.OrderItem = mongoose.model('OrderItem', orderItemSchema);
