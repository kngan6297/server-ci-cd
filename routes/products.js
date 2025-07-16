const express = require("express");
const { body, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const Product = require("../models/Product");

const router = express.Router();

// Database connection check middleware
const checkDBConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: "Database connection not available",
      message:
        "Please ensure MongoDB is running or check your connection string",
      status: "service_unavailable",
    });
  }
  next();
};

// Validation middleware
const validateProduct = [
  body("name")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage(
      "Product name is required and must be between 1-100 characters"
    ),
  body("description")
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage(
      "Description is required and must be between 1-500 characters"
    ),
  body("price")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("category")
    .trim()
    .isLength({ min: 1 })
    .withMessage("Category is required"),
  body("stock")
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),
  body("imageUrl")
    .optional()
    .isURL()
    .withMessage("Image URL must be a valid URL"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
];

// GET all products
router.get("/", checkDBConnection, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = { isActive: true };

    // Category filter
    if (category) {
      query.category = category;
    }

    // Search filter
    if (search) {
      query.$text = { $search: search };
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const products = await Product.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Product.countDocuments(query);

    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET single product by ID
router.get("/:id", checkDBConnection, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    console.error("Error fetching product:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST create new product
router.post("/", checkDBConnection, validateProduct, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = new Product(req.body);
    const savedProduct = await product.save();

    res.status(201).json(savedProduct);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: error.message });
  }
});

// PUT update product
router.put("/:id", checkDBConnection, validateProduct, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    console.error("Error updating product:", error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH partial update product
router.patch("/:id", checkDBConnection, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    console.error("Error updating product:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE product (soft delete)
router.delete("/:id", checkDBConnection, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    console.error("Error deleting product:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET categories
router.get("/categories/list", checkDBConnection, async (req, res) => {
  try {
    const categories = await Product.distinct("category");
    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
