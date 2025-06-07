import { asc, desc, eq, ilike, or } from 'drizzle-orm';
import { db } from './db/index.js';
import { todosTable } from './db/schema.js';

/**
 * Fetch all todos from DB with optional filters
 */
async function getAllTodos(options = {}) {
  let query = db.select().from(todosTable);

  if (options.orderBy) {
    const direction = options.direction === 'desc' ? desc : asc;
    query = query.orderBy(direction(todosTable[options.orderBy]));
  } else {
    query = query.orderBy(desc(todosTable.created_at));
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  return await query;
}

/**
 * Create a new todo with given text and priority
 */
async function createTodo(todoText, priority = 'medium', category = null) {
  const [inserted] = await db.insert(todosTable).values({
    todo: todoText,
    priority: priority,
    category: category,
  }).returning({
    id: todosTable.id,
  });

  return inserted.id;
}

/**
 * Delete todo by id
 */
async function deleteTodoById(id) {
  const result = await db.delete(todosTable).where(eq(todosTable.id, id));
  return result.rowCount > 0;
}

/**
 * Delete multiple todos by ids
 */
async function deleteTodosByIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return 0;

  const result = await db.delete(todosTable)
    .where(
      or(...ids.map(id => eq(todosTable.id, id)))
    );
  return result.rowCount;
}

/**
 * Search todos by partial text (case-insensitive)
 */
async function searchTodos(searchText, field = 'all') {
  const pattern = `%${searchText}%`;
  let whereClause;

  if (field === 'category') {
    whereClause = ilike(todosTable.category, pattern);
  } else if (field === 'todo') {
    whereClause = ilike(todosTable.todo, pattern);
  } else {
    whereClause = or(
      ilike(todosTable.todo, pattern),
      ilike(todosTable.category, pattern)
    );
  }

  return await db.select()
    .from(todosTable)
    .where(whereClause)
    .orderBy(desc(todosTable.created_at));
}

/**
 * Update a todo by id
 */
async function updateTodo(id, newText = null, priority = null, category = null) {
  const updates = { updated_at: new Date() };

  if (newText) updates.todo = newText;
  if (priority) updates.priority = priority;
  if (category !== null) updates.category = category;

  const result = await db.update(todosTable)
    .set(updates)
    .where(eq(todosTable.id, id));

  return result.rowCount > 0;
}

/**
 * Mark todo as completed
 */
async function markTodoCompleted(id) {
  const result = await db.update(todosTable)
    .set({ completed: true, completed_at: new Date(), updated_at: new Date() })
    .where(eq(todosTable.id, id));

  return result.rowCount > 0;
}

/**
 * Mark todo as incomplete
 */
async function markTodoIncomplete(id) {
  const result = await db.update(todosTable)
    .set({ completed: false, completed_at: null, updated_at: new Date() })
    .where(eq(todosTable.id, id));

  return result.rowCount > 0;
}

/**
 * Get todos by priority
 */
async function getTodosByPriority(priority) {
  return await db.select()
    .from(todosTable)
    .where(eq(todosTable.priority, priority))
    .orderBy(desc(todosTable.created_at));
}

/**
 * Get todos by category
 */
async function getTodosByCategory(category) {
  return await db.select()
    .from(todosTable)
    .where(eq(todosTable.category, category))
    .orderBy(desc(todosTable.created_at));
}

/**
 * Get todo statistics
 */
async function getTodoStats() {
  const todos = await getAllTodos();
  const completed = todos.filter(t => t.completed).length;
  const pending = todos.length - completed;
  const priorities = todos.reduce((acc, t) => {
    acc[t.priority] = (acc[t.priority] || 0) + 1;
    return acc;
  }, {});
  const categories = todos.reduce((acc, t) => {
    if (t.category) {
      acc[t.category] = (acc[t.category] || 0) + 1;
    }
    return acc;
  }, {});

  return { total: todos.length, completed, pending, priorities, categories };
}

/**
 * Clear completed todos
 */
async function clearCompleted() {
  const result = await db.delete(todosTable).where(eq(todosTable.completed, true));
  return result.rowCount;
}

/**
 * Get a single todo by ID
 */
async function getTodoById(id) {
  const [todo] = await db.select().from(todosTable).where(eq(todosTable.id, id));
  return todo;
}



export {
    clearCompleted, createTodo,
    deleteTodoById,
    deleteTodosByIds, getAllTodos, getTodoById, getTodosByCategory, getTodosByPriority, getTodoStats, markTodoCompleted,
    markTodoIncomplete, searchTodos,
    updateTodo
};
