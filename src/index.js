import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { db } from './db/index.js';
import { todosTable } from './db/schema.js';
import { ilike, eq } from 'drizzle-orm';
import ollama from 'ollama';

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

const rl = readline.createInterface({ input, output });

async function main() {
  console.log('Welcome to the AI To-Do List Assistant! Type your commands. Type "exit" to quit.');

  while (true) {
    const userInput = await rl.question('You: ');
    if (userInput.toLowerCase() === 'exit') break;



    const SYSTEM_PROMPT = `
You are an AI To-Do List Assistant.
Your job is to help a user manage their to-do list.

Todo DB Schema:
id: Int and Primary Key
todo: String
created_at: Date Time
updated_at: Date Time
Available Tools:
- getAllTodos(): Get all todos
- createTodo(todo: string): Create a new todo in the DB
- deleteTodoById(id: string): Delete a todo by id
- searchTodos(query: string): Search for todos by title
`

;


const response = await ollama.chat({
  model: 'dolphin3',
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userInput },
  ],
});


    const botReply = response.message.content;
    console.log('Assistant:', botReply);

    // Command handling examples
    if (userInput.toLowerCase().includes('show all todos')) {
      const allTodos = await getAllTodos();
      console.log('Your Todos:');
      allTodos.forEach(todo => {
        console.log(`- [${todo.id}] ${todo.todo}`);
      });
    }

    if (userInput.toLowerCase().startsWith('add todo')) {
      const todoText = userInput.slice(8).trim();
      if (todoText) {
        const id = await createTodo(todoText);
        console.log(`Created todo with id ${id}`);
      } else {
        console.log('Please specify the todo text after "add todo"');
      }
    }

    // Add more commands as needed...
  }

 


  
  rl.close();
  console.log('Goodbye!');
}

main().catch(err => {
  console.error('Error:', err);
});
