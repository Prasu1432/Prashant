const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public")); // Serve static files

// Dummy Data (In-Memory Database)
let users = [];
let media = [];

// JWT Secret
const JWT_SECRET = "1212312123";

// File Upload Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Routes
app.get("/", (req, res) => res.redirect("/login.html"));

// Register User
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.redirect("/register.html?error=All%20fields%20are%20required");
  }
  if (users.find((user) => user.email === email)) {
    return res.redirect("/register.html?error=User%20already%20exists");
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ id: Date.now(), username, email, password: hashedPassword });
  res.redirect("/login.html?success=Registered%20successfully");
});

// Login User
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.redirect("/login.html?error=Email%20and%20password%20are%20required");
  }
  const user = users.find((u) => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.redirect("/login.html?error=Invalid%20credentials");
  }
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "1h" });
  res.redirect(`/feed.html?token=${token}`);
});

// Get Feed
app.get("/feed", (req, res) => {
  res.json(
    media.map((item) => ({
      id: item.id,
      title: item.title,
      file_url: `/uploads/${item.file_url}`,
      username: users.find((user) => user.id === item.user_id)?.username || "Unknown",
    }))
  );
});

// Upload Media
app.post("/upload", upload.single("file"), (req, res) => {
  const { title, user_id } = req.body;
  if (!title || !user_id || !req.file) {
    return res.redirect("/upload.html?error=All%20fields%20are%20required");
  }
  media.push({
    id: Date.now(),
    title,
    file_url: req.file.filename,
    user_id: parseInt(user_id),
  });
  res.redirect("/upload.html?success=File%20uploaded%20successfully");
});

// Update Media Details (Modify)
app.put("/media/:id", (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  const mediaItem = media.find((item) => item.id === parseInt(id));
  if (!mediaItem) return res.status(404).json({ error: "Media not found" });
  mediaItem.title = title || mediaItem.title;
  res.json({ success: true, message: "Media updated successfully", mediaItem });
});

// Delete Media
app.delete("/media/:id", (req, res) => {
  const { id } = req.params;
  const mediaIndex = media.findIndex((item) => item.id === parseInt(id));
  if (mediaIndex === -1) return res.status(404).json({ error: "Media not found" });

  const mediaItem = media[mediaIndex];
  const filePath = `public/uploads/${mediaItem.file_url}`;
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error("Failed to delete file:", err);
      return res.status(500).json({ error: "Failed to delete file" });
    }
    media.splice(mediaIndex, 1);
    res.json({ success: true, message: "Media deleted successfully" });
  });
});

// Static File Serving
app.use("/uploads", express.static("public/uploads"));

// Start Server
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
