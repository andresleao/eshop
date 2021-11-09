const { Category } = require('../models/category');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

router.get(`/`, async (req, res) => {
  const categoryList = await Category.find();

  if (!categoryList) {
    res.status(500).json({ success: false });
  }
  res.status(200).send(categoryList);
});

router.get('/:id', async (req, res) => {
  const validId = mongoose.Types.ObjectId.isValid(req.params.id);
  if (!validId) {
    return res.status(500).json({ error: 'Invalid ID' });
  }

  const category = await Category.findById(req.params.id);

  if (!category) {
    return res
      .status(500)
      .json({ message: 'The category with the given ID was not found!' });
  }

  return res.status(200).send(category);
});

router.post('/', async (req, res) => {
  let category = new Category({
    name: req.body.name,
    icon: req.body.icon,
    color: req.body.color,
  });

  category = await category.save();
  if (!category) {
    return res.status(404).send('The category cannot be created!');
  }

  res.send(category);
});

// Update
router.put('/:id', async (req, res) => {
  const validId = mongoose.Types.ObjectId.isValid(req.params.id);
  if (!validId) {
    return res.status(500).json({ error: 'Invalid ID' });
  }

  const { name, icon, color } = req.body;

  const category = await Category.findByIdAndUpdate(
    req.params.id,
    {
      name,
      icon,
      color,
    },
    { new: true }
  );

  if (!category) {
    return res.status(404).send('The category cannot be updated!');
  }

  return res.send(category);
});

router.delete('/:id', (req, res) => {
  const validId = mongoose.Types.ObjectId.isValid(req.params.id);
  if (!validId) {
    return res.status(500).json({ error: 'Invalid ID' });
  }

  Category.findByIdAndRemove(req.params.id)
    .then((category) => {
      if (category) {
        return res
          .status(200)
          .json({ success: true, message: 'The category is deleted!' });
      } else {
        return res
          .status(404)
          .json({ success: false, message: 'Category not found!' });
      }
    })
    .catch((err) => {
      return res.status(400).json({ success: false, error: err });
    });
});

module.exports = router;
