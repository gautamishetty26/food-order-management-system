
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Serve HTML, CSS and JavaScript from public folder
app.use(express.static(path.join(__dirname, "public")));

// ================= FOOD SCHEMA =================

const foodSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 1
  },
  available: {
    type: Boolean,
    default: true
  }
});

const Food = mongoose.model("Food", foodSchema);

// ================= ORDER SCHEMA =================

const orderSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  items: [
    {
      foodId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Food",
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 1
      }
    }
  ],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: [
      "Pending",
      "Confirmed",
      "Preparing",
      "Delivered",
      "Cancelled"
    ],
    default: "Pending"
  }
}, { timestamps: true });

const Order = mongoose.model("Order", orderSchema);

// ================= FRONTEND ROUTE =================

// Display the Foodie website at localhost:3000
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API welcome message
app.get("/api", (req, res) => {
  res.json({
    message: "Welcome to Food Order Management API"
  });
});

// ================= FOOD CRUD =================

// CREATE food
app.post("/foods", async (req, res) => {
  try {
    const food = await Food.create(req.body);
    res.status(201).json(food);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// READ all food
app.get("/foods", async (req, res) => {
  try {
    const foods = await Food.find();
    res.json(foods);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ one food
app.get("/foods/:id", async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);

    if (!food) {
      return res.status(404).json({
        message: "Food not found"
      });
    }

    res.json(food);
  } catch (error) {
    res.status(400).json({
      error: "Invalid food ID"
    });
  }
});

// UPDATE food
app.put("/foods/:id", async (req, res) => {
  try {
    const food = await Food.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!food) {
      return res.status(404).json({
        message: "Food not found"
      });
    }

    res.json(food);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE food
app.delete("/foods/:id", async (req, res) => {
  try {
    const food = await Food.findByIdAndDelete(req.params.id);

    if (!food) {
      return res.status(404).json({
        message: "Food not found"
      });
    }

    res.json({
      message: "Food deleted successfully",
      food
    });
  } catch (error) {
    res.status(400).json({
      error: "Invalid food ID"
    });
  }
});

// ================= ORDER CRUD =================

// CREATE order
app.post("/orders", async (req, res) => {
  try {
    const { customerName, phone, items } = req.body;

    if (
      !customerName ||
      !customerName.trim() ||
      !phone ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message: "Customer name, phone and food items are required"
      });
    }

    let totalAmount = 0;
    const checkedItems = [];

    for (const item of items) {
      const quantity = Number(item.quantity);

      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({
          message: "Quantity must be a positive whole number"
        });
      }

      if (!mongoose.isValidObjectId(item.foodId)) {
        return res.status(400).json({
          message: "Invalid food ID"
        });
      }

      const food = await Food.findById(item.foodId);

      if (!food || !food.available) {
        return res.status(400).json({
          message: "Food not found or unavailable"
        });
      }

      totalAmount += food.price * quantity;

      checkedItems.push({
        foodId: food._id,
        quantity
      });
    }

    const order = await Order.create({
      customerName: customerName.trim(),
      phone: phone.trim(),
      items: checkedItems,
      totalAmount
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// READ all orders
app.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find().populate("items.foodId");
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ one order
app.get("/orders/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("items.foodId");

    if (!order) {
      return res.status(404).json({
        message: "Order not found"
      });
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({
      error: "Invalid order ID"
    });
  }
});

// UPDATE order
app.put("/orders/:id", async (req, res) => {
  try {
    const allowedFields = [
      "customerName",
      "phone",
      "status"
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true
      }
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found"
      });
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE order
app.delete("/orders/:id", async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found"
      });
    }

    res.json({
      message: "Order deleted successfully",
      order
    });
  } catch (error) {
    res.status(400).json({
      error: "Invalid order ID"
    });
  }
});

// ================= START SERVER =================

async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from .env");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup error:", error.message);
  }
}

startServer();
