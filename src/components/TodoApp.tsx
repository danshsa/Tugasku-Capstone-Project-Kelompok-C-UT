
import { useState } from 'react';
import { Plus } from 'lucide-react';
import TodoItem from './TodoItem';

// Define what a todo item looks like
interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

const TodoApp = () => {
  // State to store all our todos
  const [todos, setTodos] = useState<Todo[]>([]);
  // State to store what the user is typing
  const [inputText, setInputText] = useState('');

  // Function to add a new todo
  const addTodo = () => {
    // Don't add empty todos
    if (inputText.trim() === '') return;
    
    // Create a new todo object
    const newTodo: Todo = {
      id: Date.now(), // Simple way to create unique IDs
      text: inputText.trim(),
      completed: false
    };
    
    // Add the new todo to our list
    setTodos([...todos, newTodo]);
    // Clear the input field
    setInputText('');
  };

  // Function to toggle if a todo is completed or not
  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo => 
      todo.id === id 
        ? { ...todo, completed: !todo.completed }
        : todo
    ));
  };

  // Function to delete a todo
  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  // Function to handle pressing Enter in the input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">My Todo List</h1>
        <p className="text-gray-600">Keep track of your daily tasks</p>
      </div>

      {/* Add new todo section */}
      <div className="flex gap-3 mb-8">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="What do you need to do?"
          className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none transition-colors text-lg"
        />
        <button
          onClick={addTodo}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl transition-colors flex items-center gap-2 font-medium"
        >
          <Plus size={20} />
          Add
        </button>
      </div>

      {/* Todo list */}
      <div className="space-y-3">
        {todos.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-xl">No todos yet!</p>
            <p>Add one above to get started.</p>
          </div>
        ) : (
          todos.map(todo => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
            />
          ))
        )}
      </div>

      {/* Stats */}
      {todos.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-gray-600">
          <p>
            {todos.filter(todo => todo.completed).length} of {todos.length} tasks completed
          </p>
        </div>
      )}
    </div>
  );
};

export default TodoApp;
