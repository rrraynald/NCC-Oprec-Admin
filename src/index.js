const express = require("express");
const app = express();
app.use(express.json());

const notes = [];
let idCounter = 1;

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Create note
app.post("/notes", (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required" });
  }
  const note = {
    id: idCounter++,
    title,
    content,
    createdAt: new Date().toISOString(),
  };
  notes.push(note);
  res.status(201).json(note);
});

// Get all notes
app.get("/notes", (req, res) => {
  res.json(notes);
});

// Get note by ID
app.get("/notes/:id", (req, res) => {
  const note = notes.find((n) => n.id === parseInt(req.params.id));
  if (!note) return res.status(404).json({ error: "Note not found" });
  res.json(note);
});

// Delete note
app.delete("/notes/:id", (req, res) => {
  const index = notes.findIndex((n) => n.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Note not found" });
  notes.splice(index, 1);
  res.status(204).send();
});

// Reset (Testing)
app.delete("/reset", (req, res) => {
  notes.length = 0;
  idCounter = 1;
  res.json({ message: "Reset done" });
});

// // Uncomment fitur berikut untuk trigger code smell, bug, dan vulnerability di SonarQube
// app.get("/notes/search", (req, res) => {
//   var query = req.query.q; // code smell: pakai var
//   var results = [];

//   for (var i = 0; i < notes.length; i++) {
//     // code smell: var
//     if (notes[i].title == query) {
//       // bug: pakai ==, seharusnya ===
//       results.push(notes[i]);
//     }
//   }

//   if (query == undefined) {
//     // bug: ==, seharusnya ===
//     return res.status(400).json({ error: "Query required" });
//   }

//   var password = "admin123"; // vulnerability: hardcoded credential
//   console.log(password); // code smell: console.log di production

//   eval("var x = 1"); // vulnerability: eval

//   res.json(results);
// });

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
