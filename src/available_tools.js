import {
    clearCompleted,
    createTodo,
    deleteTodoById,
    deleteTodosByIds,
    getAllTodos,
    getTodoById,
    getTodosByCategory,
    getTodosByPriority,
    getTodoStats,
    markTodoCompleted,
    markTodoIncomplete,
    searchTodos,
    updateTodo
} from './tools.js';


// Enhanced tools for the AI
export const AVAILABLE_TOOLS = {
  getAllTodos: {
    name: 'getAllTodos',
    description: 'Get all todos from the database with optional ordering and limits',
    parameters: {
      orderBy: { type: 'string', description: 'Field to order by: created_at, updated_at, priority', optional: true },
      direction: { type: 'string', description: 'asc or desc', optional: true },
      limit: { type: 'number', description: 'Maximum number of todos to return', optional: true }
    },
    func: getAllTodos
  },
  createTodo: {
    name: 'createTodo',
    description: 'Create a new todo item with optional priority and category',
    parameters: {
      todoText: { type: 'string', description: 'The text of the todo item' },
      priority: { type: 'string', description: 'Priority: low, medium, high', optional: true },
      category: { type: 'string', description: 'Category for the todo', optional: true }
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
  deleteTodosByIds: {
    name: 'deleteTodosByIds',
    description: 'Delete multiple todos by their IDs',
    parameters: {
      ids: { type: 'array', description: 'Array of todo IDs to delete' }
    },
    func: deleteTodosByIds
  },
  searchTodos: {
    name: 'searchTodos',
    description: 'Search for todos by text content in todo text or category',
    parameters: {
      searchText: { type: 'string', description: 'Text to search for in todos' },
      field: { type: 'string', description: 'Field to search: todo, category, or all', optional: true }
    },
    func: searchTodos
  },
  updateTodo: {
    name: 'updateTodo',
    description: 'Update a todo item (text, priority, category)',
    parameters: {
      id: { type: 'number', description: 'The ID of the todo to update' },
      newText: { type: 'string', description: 'New text for the todo', optional: true },
      priority: { type: 'string', description: 'New priority: low, medium, high', optional: true },
      category: { type: 'string', description: 'New category', optional: true }
    },
    func: updateTodo
  },
  markTodoCompleted: {
    name: 'markTodoCompleted',
    description: 'Mark a todo as completed',
    parameters: {
      id: { type: 'number', description: 'The ID of the todo to complete' }
    },
    func: markTodoCompleted
  },
  markTodoIncomplete: {
    name: 'markTodoIncomplete',
    description: 'Mark a todo as incomplete/pending',
    parameters: {
      id: { type: 'number', description: 'The ID of the todo to mark incomplete' }
    },
    func: markTodoIncomplete
  },
  getTodosByPriority: {
    name: 'getTodosByPriority',
    description: 'Get todos filtered by priority level',
    parameters: {
      priority: { type: 'string', description: 'Priority level: low, medium, high' }
    },
    func: getTodosByPriority
  },
  getTodosByCategory: {
    name: 'getTodosByCategory',
    description: 'Get todos filtered by category',
    parameters: {
      category: { type: 'string', description: 'Category name' }
    },
    func: getTodosByCategory
  },
  getTodoStats: {
    name: 'getTodoStats',
    description: 'Get statistics about todos (total, completed, pending, by priority/category)',
    parameters: {},
    func: getTodoStats
  },
  clearCompleted: {
    name: 'clearCompleted',
    description: 'Delete all completed todos',
    parameters: {},
    func: clearCompleted
  },
  getTodoById: {
    name: 'getTodoById',
    description: 'Get a specific todo by its ID',
    parameters: {
      id: { type: 'number', description: 'The ID of the todo to retrieve' }
    },
    func: getTodoById
  }
};
