# 🧠 AI-Powered Todo Assistant

A conversational command-line Todo app powered by Ollama (Dolphin3 model) and Drizzle ORM. This assistant understands natural language to manage todos—create, search, update, or delete—through a smooth and interactive interface.

## 🚀 Features

- ✅ Natural language understanding via Ollama
- 📄 Manage todos (Create, Read, Update, Delete)
- 🔍 Search todos with partial text matching
- 🧠 LLM-assisted command parsing
- 💬 Conversational and friendly CLI assistant
- 🧰 Built-in function tool parsing + error handling

## 🛠️ Tech Stack

- Node.js
- Ollama (`dolphin3` model)
- Drizzle ORM
- SQLite (or any compatible SQL DB)
- ESBuild & ES Modules
- Terminal interface via `readline/promises`

## 📦 Installation

```bash
git clone https://github.com/your-username/todo-assistant.git
cd todo-assistant
npm install
````

> Make sure you have [Ollama](https://ollama.com/) installed and the `dolphin3` model pulled.

```bash
ollama pull dolphin3
```

## 🧠 Usage

```bash
node index.js
```

The assistant will start and guide you through managing your todos in natural language.

### ✨ Examples

* `Show me all my todos`
* `Add a todo to buy milk`
* `Delete todo 3`
* `Update todo 2 to “buy bread instead”`
* `Search todos for groceries`

## 🧩 Available Functions (for AI use)

```js
- getAllTodos(): Returns all todos
- createTodo("todo text"): Adds a new todo
- deleteTodoById(id): Deletes a todo by ID
- searchTodos("search text"): Searches todos
- updateTodo(id, "new text"): Updates a todo
```

## 📁 Project Structure

```
.
├── index.js              # Main application logic
├── db/
│   ├── index.js          # Drizzle ORM DB instance
│   └── schema.js         # Todos table schema
├── drizzle.config.js     # ORM config
├── package.json
└── README.md
```

## 🔐 Environment Setup

Create a `.env` file (if needed for DB path or API keys):

```env
DATABASE_URL=your-database-path.sqlite
```

## ⚠️ Notes

* The `markTodoCompleted` function is a placeholder (needs schema update).
* AI function parsing is based on strict format: `functionName(param1, param2)`.
* Natural language is converted into tool calls using regex + Ollama prompt.

## ✅ Todo

* [x] Natural language command parsing
* [x] Function calling system
* [x] Drizzle ORM integration
* [ ] Add a `completed` field to todos
* [ ] Improve fuzzy search with vector embeddings (optional future enhancement)

## 🧠 Powered By

* [Ollama](https://ollama.com/)
* [Drizzle ORM](https://orm.drizzle.team/)
* Node.js and ES Modules

---

## 🧑‍💻 Author

Made with ❤️ by Umyal Dixit
