const request = require("supertest");
const app = require("./index");

beforeEach(async () => {
  await request(app).delete("/reset");
});

describe("Health", () => {
  test("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("Notes CRUD", () => {
  test("POST /notes creates a note", async () => {
    const res = await request(app)
      .post("/notes")
      .send({ title: "Test", content: "Hello" });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Test");
    expect(res.body.id).toBeDefined();
  });

  test("POST /notes returns 400 without title", async () => {
    const res = await request(app).post("/notes").send({ content: "No title" });
    expect(res.status).toBe(400);
  });

  test("POST /notes returns 400 without content", async () => {
    const res = await request(app).post("/notes").send({ title: "No content" });
    expect(res.status).toBe(400);
  });

  test("GET /notes returns all notes", async () => {
    await request(app).post("/notes").send({ title: "A", content: "aaa" });
    await request(app).post("/notes").send({ title: "B", content: "bbb" });

    const res = await request(app).get("/notes");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test("GET /notes/:id returns specific note", async () => {
    const created = await request(app)
      .post("/notes")
      .send({ title: "Find", content: "me" });

    const res = await request(app).get(`/notes/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Find");
  });

  test("GET /notes/:id returns 404 for non-existing", async () => {
    const res = await request(app).get("/notes/999");
    expect(res.status).toBe(404);
  });

  test("DELETE /notes/:id deletes a note", async () => {
    const created = await request(app)
      .post("/notes")
      .send({ title: "Delete", content: "me" });

    const res = await request(app).delete(`/notes/${created.body.id}`);
    expect(res.status).toBe(204);

    const check = await request(app).get(`/notes/${created.body.id}`);
    expect(check.status).toBe(404);
  });

  test("DELETE /notes/:id returns 404 for non-existing", async () => {
    const res = await request(app).delete("/notes/999");
    expect(res.status).toBe(404);
  });
});
