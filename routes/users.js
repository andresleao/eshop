const { User } = require('../models/user');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

router.get(`/`, async (req, res) => {
  //const userList = await User.find().select('name email phone');
  const userList = await User.find().select('-passwordHash');

  if (!userList) {
    res.status(500).json({ success: false });
  }
  res.send(userList);
});

router.get('/:id', async (req, res) => {
  const validUseryId = mongoose.isValidObjectId(req.params.id);
  if (!validUseryId) {
    return res.status(400).json({ error: 'User does not exist!' });
  }

  const user = await User.findById(req.params.id).select('-passwordHash');

  if (!user) {
    return res
      .status(500)
      .json({ message: 'The User with the given ID was not found!' });
  }

  return res.status(200).send(user);
});

router.post('/register', async (req, res) => {
  let user = new User({
    name: req.body.name,
    email: req.body.email,
    passwordHash: bcrypt.hashSync(req.body.password, 8),
    phone: req.body.phone,
    isAdmin: req.body.isAdmin,
    street: req.body.street,
    apartment: req.body.apartment,
    zip: req.body.zip,
    city: req.body.city,
    country: req.body.country,
  });

  user = await user.save();
  if (!user) {
    return res.status(404).send('The user cannot be created!');
  }

  return res.status(201).json({ message: 'User created successfully' });
});

router.post('/login', async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  const secret = process.env.secret;

  if (!user) {
    return res.status(400).json({ error: 'User not found!' });
  }

  if (user && bcrypt.compareSync(req.body.password, user.passwordHash)) {
    const token = jwt.sign(
      {
        userId: user.id,
        isAdmin: user.isAdmin,
      },
      secret,
      { expiresIn: '1d' }
    );
    return res.status(200).send({ user: user.email, token: token });
  } else {
    return res.status(400).json({ error: 'Password is wrong!' });
  }

  return res.status(200).send(user);
});

router.get('/get/count', async (req, res) => {
  const userCount = await User.countDocuments((count) => count);

  if (!userCount) {
    return res.status(500).json({ success: false });
  }

  return res.send({ count: userCount });
});

router.delete('/:id', (req, res) => {
  const validId = mongoose.Types.ObjectId.isValid(req.params.id);
  if (!validId) {
    return res.status(500).json({ error: 'Invalid ID' });
  }

  User.findByIdAndRemove(req.params.id)
    .then((user) => {
      if (user) {
        return res
          .status(200)
          .json({ success: true, message: 'The user is deleted!' });
      } else {
        return res
          .status(404)
          .json({ success: false, message: 'User not found!' });
      }
    })
    .catch((err) => {
      return res.status(400).json({ success: false, error: err });
    });
});

module.exports = router;
