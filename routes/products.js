const { Product } = require('../models/product');
const { Category } = require('../models/category');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');

const FILE_TYPE_MAP = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg',
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const isValid = FILE_TYPE_MAP[file.mimetype];
    let uploadError = new Error('Invalid image type');
    //let errorMessage = { error: uploadError.message };

    if (isValid) {
      uploadError = null;
    }

    cb(uploadError, 'public/uploads');
  },
  filename: function (req, file, cb) {
    // console.log(file.originalname);
    // const fileName = file.originalname.split(' ').join('-');
    // const extension = FILE_TYPE_MAP[file.mimetype];
    // cb(null, `${fileName}-${Date.now()}.${extension}`);
    path.resolve(__dirname, '..', '..', 'uploads');
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${Date.now()}${ext}`);
  },
});

const uploadOptions = multer({ storage: storage });

// findAll
router.get(`/`, async (req, res) => {
  //const productList = await Product.find().select('name image -_id');
  // localhost:3000/api/v1/products?categories=1293878342,98798732 (query param)
  let filter = {};
  if (req.query.categories) {
    filter = { category: req.query.categories.split(',') };
  }

  const productList = await Product.find(filter).populate('category');

  if (!productList) {
    res.status(500).json({ success: false });
  }
  res.send(productList);
});

router.get(`/:id`, async (req, res) => {
  const id = mongoose.Types.ObjectId.isValid(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Product not found!' });
  }

  const product = await Product.findById(req.params.id).populate('category');

  if (!product) {
    return res.status(500).json({ error: 'Product not found!' });
  }
  return res.send(product);
});

router.post(`/`, uploadOptions.single('image'), async (req, res) => {
  const validCategoryId = mongoose.isValidObjectId(req.body.category);
  if (!validCategoryId) {
    return res.status(400).json({ error: 'Invalid Category!' });
  }

  const category = await Category.findById(req.body.category);
  if (!category) {
    return res.status(400).json({ error: 'Invalid Category Id' });
  }

  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file in the request!' });
  }

  const fileName = req.file.filename;
  const basePath = `${req.protocol}://${req.get('host')}/public/uploads`;

  let product = new Product({
    name: req.body.name,
    description: req.body.description,
    richDescription: req.body.richDescription,
    image: `${basePath}/${fileName}`, // http://localhost:3000/public/uploads/fileName.jpg
    brand: req.body.brand,
    price: req.body.price,
    category: req.body.category,
    countInStock: req.body.countInStock,
    rating: req.body.rating,
    numReviews: req.body.numReviews,
    isFeatured: req.body.isFeatured,
  });

  product = await product.save();
  if (!product) {
    return res.status(500).send('The product cannot be created!');
  }

  return res.send(product);
});

// Update
router.put('/:id', uploadOptions.single('image'), async (req, res) => {
  const validId = mongoose.Types.ObjectId.isValid(req.params.id);
  if (!validId) {
    return res.status(500).json({ error: 'Invalid ID' });
  }

  const categoryId = mongoose.Types.ObjectId.isValid(req.body.category);
  if (!categoryId) {
    return res.status(500).json({ error: 'Invalid Category' });
  }

  const category = await Category.findById(req.body.category);
  if (!category) {
    return res.status(400).json({ error: 'Invalid Category' });
  }

  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(400).json({ error: 'Product not found!' });
  }

  const file = req.file;
  let imagepath;

  if (file) {
    const fileName = file.filename;
    const basePath = `${req.protocol}://${req.get('host')}/public/uploads`;
    imagepath = `${basePath}/${fileName}`;
  } else {
    imagepath = product.image;
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
      description: req.body.description,
      richDescription: req.body.richDescription,
      image: imagepath,
      brand: req.body.brand,
      price: req.body.price,
      category: req.body.category,
      countInStock: req.body.countInStock,
      rating: req.body.rating,
      numReviews: req.body.numReviews,
      isFeatured: req.body.isFeatured,
    },
    { new: true }
  );

  if (!updatedProduct) {
    return res.status(500).send('The product cannot be updated!');
  }

  return res.send(updatedProduct);
});

// Upload images
router.put(
  '/gallery-images/:id',
  uploadOptions.array('images', 10),
  async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid product id!' });
    }

    const files = req.files;
    let imagesPaths = [];
    const basePath = `${req.protocol}://${req.get('host')}/public/uploads`;

    if (files) {
      files.map((file) => {
        imagesPaths.push(`${basePath}/${file.filename}`);
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      {
        images: imagesPaths,
      },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(500).json({ error: 'The product cannot be updated!' });
    }

    return res.send(updatedProduct);
  }
);

router.delete('/:id', (req, res) => {
  Product.findByIdAndRemove(req.params.id)
    .then((product) => {
      if (product) {
        return res
          .status(200)
          .json({ success: true, message: 'The product is deleted!' });
      } else {
        return res
          .status(404)
          .json({ success: false, message: 'Product not found!' });
      }
    })
    .catch((err) => {
      return res.status(400).json({ success: false, error: err });
    });
});

router.get('/get/count', async (req, res) => {
  const productCount = await Product.countDocuments((count) => count);

  if (!productCount) {
    return res.status(500).json({ success: false });
  }

  return res.send({ count: productCount });
});

router.get('/get/featured/:count', async (req, res) => {
  const { count } = req.params ? req.params : 0;
  const products = await Product.find({ isFeatured: true }).limit(+count);

  if (!products) {
    return res.status(500).json({ success: false });
  }

  return res.send(products);
});

module.exports = router;
