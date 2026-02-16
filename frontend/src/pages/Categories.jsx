import React, { useState, useEffect } from 'react';
import api from '../api/api';

function Categories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('expense');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/categories/');
      setCategories(response.data);
      setError('');
    } catch (err) {
      setError('Error fetching categories');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/categories/', { name, type });
      setName('');
      setType('expense');
      fetchCategories();
    } catch (err) {
      setError('Error creating category');
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await api.delete(`/categories/${id}`);
        fetchCategories();
      } catch (err) {
        setError('Error deleting category');
        console.error(err);
      }
    }
  };

  return (
    <div className="categories-page">
      <h1>Categories</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <section className="category-form">
        <h2>Add New Category</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="category-name">Name:</label>
            <input
              id="category-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="category-type">Type:</label>
            <select
              id="category-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <button type="submit">Add Category</button>
        </form>
      </section>

      <section className="category-list">
        <h2>Existing Categories</h2>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td>{category.name}</td>
                  <td>{category.type}</td>
                  <td>
                    <button onClick={() => handleDelete(category.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan="3">No categories found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export default Categories;
