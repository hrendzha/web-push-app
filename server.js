require("dotenv").config();
const express = require("express");
const webPush = require("web-push");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

webPush.setVapidDetails("mailto:your-email@example.com", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

let subscriptions = [];

// Route to serve the main HTML page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Serve the Service Worker file
app.get("/sw.js", (req, res) => {
  res.sendFile(path.join(__dirname, "sw.js"));
});

// API route to subscribe to notifications
app.post("/api/subscribe", (req, res) => {
  const { username, subscription } = req.body;

  const isSuchNameExists = subscriptions.find(s => s.username === username);

  if (isSuchNameExists) {
    res.status(400).json({ message: "Such username already exist!" });
    return;
  }

  const isSuchSubExists = subscriptions.find(s => s.subscription.endpoint === subscription.endpoint);

  if (isSuchSubExists) {
    res.status(400).json({ message: `You are already subscribed. Your username is "${isSuchSubExists.username}"` });
    return;
  }

  // Save the subscription with the username
  subscriptions.push({ username, subscription });
  res.status(201).json({ message: "Subscription added successfully!" });
});

// Endpoint to list all subscribed users
app.get("/api/subscribers", (req, res) => {
  const userList = subscriptions.map(sub => sub.username);
  res.status(200).json(userList);
});

// API route to trigger a notification
app.post("/api/send-notification", (req, res) => {
  const { username, title, body } = req.body;

  const userSubscription = subscriptions.find(sub => sub.username === username);

  if (!userSubscription) {
    return res.status(404).json({ error: "User not found" });
  }

  const notificationPayload = JSON.stringify({ title, body });

  webPush
    .sendNotification(userSubscription.subscription, notificationPayload)
    .then(() => res.status(200).json({ message: "Notification sent!" }))
    .catch(error => {
      console.error("Error sending notification:", error);
      res.status(500).json({ error: "Failed to send notification" });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
