
const foodForm = document.getElementById("foodForm");
const orderForm = document.getElementById("orderForm");
const foodList = document.getElementById("foodList");
const foodSelect = document.getElementById("foodSelect");

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || "Request failed");
  }

  return data;
}

function showMessage(id, message) {
  document.getElementById(id).textContent = message;
}

function createTextElement(tag, text, className = "") {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

// Load food items from MongoDB through the backend
async function loadFoods() {
  foodList.replaceChildren(createTextElement("p", "Loading menu..."));
  foodSelect.replaceChildren(
    new Option("Select a food item", "")
  );

  try {
    const foods = await apiRequest("/foods");
    foodList.replaceChildren();

    if (!Array.isArray(foods) || foods.length === 0) {
      foodList.append(createTextElement("p", "No food items yet. Add one above."));
      return;
    }

    foods.forEach(food => {
      const card = document.createElement("div");
      card.className = "food-card";

      card.append(
        createTextElement("h3", food.name),
        createTextElement("p", "Category: " + food.category),
        createTextElement("p", "₹" + food.price, "price"),
        createTextElement(
          "p",
          food.available === false ? "Currently unavailable" : "Available"
        )
      );

      foodList.append(card);

      if (food.available !== false) {
        foodSelect.add(
          new Option(`${food.name} — ₹${food.price}`, food._id)
        );
      }
    });
  } catch (error) {
    foodList.replaceChildren(
      createTextElement("p", "Could not load menu: " + error.message)
    );
  }
}

// Add a food item
foodForm.addEventListener("submit", async event => {
  event.preventDefault();

  const food = {
    name: document.getElementById("foodName").value.trim(),
    category: document.getElementById("foodCategory").value.trim(),
    price: Number(document.getElementById("foodPrice").value),
    available: true
  };

  try {
    await apiRequest("/foods", {
      method: "POST",
      body: JSON.stringify(food)
    });

    showMessage("foodMessage", "Food item added successfully!");
    foodForm.reset();
    await loadFoods();
  } catch (error) {
    showMessage("foodMessage", "Error: " + error.message);
  }
});

// Place an order
orderForm.addEventListener("submit", async event => {
  event.preventDefault();

  const order = {
    customerName: document.getElementById("customerName").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    items: [{
      foodId: foodSelect.value,
      quantity: Number(document.getElementById("quantity").value)
    }]
  };

  if (!order.items[0].foodId) {
    showMessage("orderMessage", "Please select a food item.");
    return;
  }

  try {
    const result = await apiRequest("/orders", {
      method: "POST",
      body: JSON.stringify(order)
    });

    showMessage(
      "orderMessage",
      "Order placed successfully! Total: ₹" +
      (result.totalAmount ?? result.order?.totalAmount ?? "Check order details")
    );

    orderForm.reset();
    document.getElementById("quantity").value = 1;
    await loadOrders();
  } catch (error) {
    showMessage("orderMessage", "Error: " + error.message);
  }
});

// View orders
async function loadOrders() {
  const orderList = document.getElementById("orderList");
  orderList.replaceChildren(createTextElement("p", "Loading orders..."));

  try {
    const orders = await apiRequest("/orders");
    orderList.replaceChildren();

    if (!Array.isArray(orders) || orders.length === 0) {
      orderList.append(createTextElement("p", "No orders found."));
      return;
    }

    orders.forEach(order => {
      const card = document.createElement("div");
      card.className = "order-card";

      card.append(
        createTextElement("h3", "Order: " + order._id),
        createTextElement("p", "Customer: " + order.customerName),
        createTextElement("p", "Phone: " + order.phone),
        createTextElement("p", "Total: ₹" + order.totalAmount, "price"),
        createTextElement("p", "Status: " + order.status)
      );

      const statusSelect = document.createElement("select");
      ["Pending", "Confirmed", "Preparing", "Delivered", "Cancelled"]
        .forEach(status => {
          statusSelect.add(new Option(status, status));
        });

      statusSelect.value = order.status;

      const updateButton = createTextElement("button", "Update Status");
      updateButton.type = "button";

      updateButton.addEventListener("click", async () => {
        try {
          await apiRequest("/orders/" + encodeURIComponent(order._id), {
            method: "PUT",
            body: JSON.stringify({ status: statusSelect.value })
          });

          showMessage("orderMessage", "Order status updated!");
          await loadOrders();
        } catch (error) {
          showMessage("orderMessage", "Error: " + error.message);
        }
      });

      card.append(statusSelect, updateButton);
      orderList.append(card);
    });
  } catch (error) {
    orderList.replaceChildren(
      createTextElement("p", "Could not load orders: " + error.message)
    );
  }
}

document.getElementById("refreshButton").addEventListener("click", loadFoods);
document.getElementById("ordersButton").addEventListener("click", loadOrders);

loadFoods();
