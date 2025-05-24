import { eq, ilike } from 'drizzle-orm';
import ollama from 'ollama';
import { stdin as input, stdout as output } from 'process';
import readline from 'readline/promises';
import { db } from './db/index.js';
import { todosTable } from './db/schema.js';

/**
 * Fetch all todos from DB
 */
async function getAllTodos() {
  return await db.select().from(todosTable);
}

/**
 * Create a new todo with given text
 * @param {string} todoText
 * @returns {number} id of created todo
 */
async function createTodo(todoText) {
  const [inserted] = await db.insert(todosTable).values({
    todo: todoText,
  }).returning({
    id: todosTable.id,
  });
  return inserted.id;
}

/**
 * Delete todo by id
 * @param {number} id
 */
async function deleteTodoById(id) {
  await db.delete(todosTable).where(eq(todosTable.id, id));
}

/**
 * Search todos by partial text (case-insensitive)
 * @param {string} searchText
 * @returns {Array}
 */
async function searchTodos(searchText) {
  const pattern = `%${searchText}%`;
  return await db.select()
    .from(todosTable)
    .where(ilike(todosTable.todo, pattern));
}

/**
 * Update a todo by id
 * @param {number} id
 * @param {string} newText
 */
async function updateTodo(id, newText) {
  await db.update(todosTable)
    .set({ todo: newText, updated_at: new Date() })
    .where(eq(todosTable.id, id));
}

/**
 * Mark todo as completed (assuming you have a completed field)
 * @param {number} id
 */
async function markTodoCompleted(id) {
  // Assuming you might want to add a completed field later
  console.log(`Todo ${id} marked as completed (feature pending schema update)`);
}

// Available tools for the AI
const AVAILABLE_TOOLS = {
  getAllTodos: {
    name: 'getAllTodos',
    description: 'Get all todos from the database',
    parameters: {},
    func: getAllTodos
  },
  createTodo: {
    name: 'createTodo',
    description: 'Create a new todo item',
    parameters: {
      todoText: { type: 'string', description: 'The text of the todo item' }
    },
    func: createTodo
  },
  deleteTodoById: {
    name: 'deleteTodoById',
    description: 'Delete a todo by its ID',
    parameters: {
      id: { type: 'number', description: 'The ID of the todo to delete' }
    },
    func: deleteTodoById
  },
  searchTodos: {
    name: 'searchTodos',
    description: 'Search for todos by text content',
    parameters: {
      searchText: { type: 'string', description: 'Text to search for in todos' }
    },
    func: searchTodos
  },
  updateTodo: {
    name: 'updateTodo',
    description: 'Update the text of an existing todo',
    parameters: {
      id: { type: 'number', description: 'The ID of the todo to update' },
      newText: { type: 'string', description: 'The new text for the todo' }
    },
    func: updateTodo
  }
};

const rl = readline.createInterface({ input, output });

function parseToolCall(text) {
  // Look for function calls in the format: functionName(param1, param2, ...)
  const functionCallRegex = /(\w+)\s*\(([^)]*)\)/g;
  const matches = [];
  let match;

  while ((match = functionCallRegex.exec(text)) !== null) {
    const functionName = match[1];
    const paramsStr = match[2].trim();

    if (AVAILABLE_TOOLS[functionName]) {
      const params = [];
      if (paramsStr) {
        // Simple parameter parsing - splits by comma and trims quotes
        const paramParts = paramsStr.split(',').map(p => p.trim());
        for (const part of paramParts) {
          if (part.startsWith('"') && part.endsWith('"')) {
            params.push(part.slice(1, -1)); // Remove quotes for strings
          } else if (part.startsWith("'") && part.endsWith("'")) {
            params.push(part.slice(1, -1)); // Remove quotes for strings
          } else if (!isNaN(part)) {
            params.push(Number(part)); // Convert numbers
          } else {
            params.push(part); // Keep as string
          }
        }
      }
      matches.push({ functionName, params });
    }
  }

  return matches;
}

async function executeTool(functionName, params) {
  try {
    const tool = AVAILABLE_TOOLS[functionName];
    if (!tool) {
      return { error: `Unknown function: ${functionName}` };
    }

    const result = await tool.func(...params);
    return { success: true, result };
  } catch (error) {
    return { error: error.message };
  }
}

function formatTodos(todos) {
  if (!todos || todos.length === 0) {
    return "No todos found.";
  }

  return todos.map(todo => {
    const date = new Date(todo.created_at).toLocaleDateString();
    return `• [${todo.id}] ${todo.todo} (created: ${date})`;
  }).join('\n');
}

async function main() {
  console.log('🤖 Welcome to your AI Todo Assistant!');
  console.log('I can help you manage your todos. Just ask me naturally!');
  console.log('Examples: "show me all my todos", "add a todo to buy milk", "delete todo 5"');
  console.log('Type "exit" to quit.\n');

  const conversationHistory = [];

  while (true) {
    const userInput = await rl.question('You: ');
    if (userInput.toLowerCase() === 'exit') break;

    // Add user message to history
    conversationHistory.push({ role: 'user', content: userInput });

    const SYSTEM_PROMPT = `You are an AI Todo List Assistant. Help users manage their todo list naturally.

Available functions you can call:
- getAllTodos(): Returns all todos from database
- createTodo("todo text"): Creates new todo, returns the ID
- deleteTodoById(id): Deletes todo by ID
- searchTodos("search text"): Searches todos by text content
- updateTodo(id, "new text"): Updates existing todo text

IMPORTANT: When you need to perform database operations, include the exact function call in your response.
Examples:
- To show all todos: "Let me get your todos: getAllTodos()"
- To add a todo: "I'll add that for you: createTodo("buy groceries")"
- To delete: "I'll delete that: deleteTodoById(5)"
- To search: "Let me search: searchTodos("meeting")"

Be conversational and helpful. Always explain what you're doing before calling functions.`;

    try {
      // Get response from LLM
      const response = await ollama.chat({
        model: 'dolphin3',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...conversationHistory.slice(-10) // Keep last 10 messages for context
        ],
      });

      const botReply = response.message.content;
      console.log('\n🤖 Assistant:', botReply);

      // Add assistant response to history
      conversationHistory.push({ role: 'assistant', content: botReply });

      // Parse and execute any function calls
      const toolCalls = parseToolCall(botReply);

      if (toolCalls.length > 0) {
        console.log('\n📋 Executing actions...\n');

        for (const call of toolCalls) {
          const result = await executeTool(call.functionName, call.params);

          if (result.success) {
            if (call.functionName === 'getAllTodos' || call.functionName === 'searchTodos') {
              console.log(formatTodos(result.result));
            } else if (call.functionName === 'createTodo') {
              console.log(`✅ Todo created successfully! (ID: ${result.result})`);
            } else if (call.functionName === 'deleteTodoById') {
              console.log('✅ Todo deleted successfully!');
            } else if (call.functionName === 'updateTodo') {
              console.log('✅ Todo updated successfully!');
            }
          } else {
            console.log(`❌ Error: ${result.error}`);
          }
        }
      }

      console.log(); // Add spacing

    } catch (error) {
      console.error('❌ Error communicating with AI:', error.message);
    }
  }

  rl.close();
  console.log('\n👋 Goodbye! Your todos are safely stored.');
}

// Enhanced error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

main().catch(err => {
  console.error('💥 Fatal Error:', err);
  process.exit(1);
});
