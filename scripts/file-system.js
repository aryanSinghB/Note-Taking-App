class FileSystemManager {
  constructor() {
    this.currentNotePath = null;
    this.notesCache = new Map(); // Cache recently used notes
  }

  /**
   * Initialize the file system manager
   */
  async init() {
    try {
      await this.ensureNotesDirectory();
      return true;
    } catch (error) {
      console.error('Failed to initialize file system manager:', error);
      return false;
    }
  }

  /**
   * Ensure the notes directory exists
   */
  async ensureNotesDirectory() {
    // This is handled by the main process
    return true;
  }

  /**
   * Get all notes
   * @returns {Promise<Array>} Array of note objects
   */
  async getAllNotes() {
    try {
      return await window.api.getNotes();
    } catch (error) {
      console.error('Error getting notes:', error);
      return [];
    }
  }

  /**
   * Create a new note
   * @param {string} title - Note title
   * @returns {Promise<Object>} Result of the operation
   */
  async createNote(title) {
    try {
      // Sanitize the title (remove invalid filename characters)
      const sanitizedTitle = this.sanitizeFilename(title);
      return await window.api.createNote(sanitizedTitle);
    } catch (error) {
      console.error('Error creating note:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Read a note's content
   * @param {string} title - Note title
   * @returns {Promise<Object>} Note content or error
   */
  async readNote(title) {
    try {
      // Check cache first
      if (this.notesCache.has(title)) {
        return { success: true, content: this.notesCache.get(title) };
      }

      // Not in cache, get from filesystem
      const result = await window.api.readNote(title);

      // Cache the result if successful
      if (result.success) {
        this.notesCache.set(title, result.content);
        this.currentNotePath = title;
      }

      return result;
    } catch (error) {
      console.error('Error reading note:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Save a note
   * @param {string} title - Note title
   * @param {string} content - Note content
   * @returns {Promise<Object>} Result of the operation
   */
  async saveNote(title, content) {
    try {
      const result = await window.api.saveNote({ title, content });

      // Update cache
      if (result.success) {
        this.notesCache.set(title, content);
      }

      return result;
    } catch (error) {
      console.error('Error saving note:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a note
   * @param {string} title - Note title
   * @returns {Promise<Object>} Result of the operation
   */
  async deleteNote(title) {
    try {
      const result = await window.api.deleteNote(title);

      // Remove from cache if successful
      if (result.success) {
        this.notesCache.delete(title);
        if (this.currentNotePath === title) {
          this.currentNotePath = null;
        }
      }

      return result;
    } catch (error) {
      console.error('Error deleting note:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Rename a note
   * @param {string} oldTitle - Current note title
   * @param {string} newTitle - New note title
   * @returns {Promise<Object>} Result of the operation
   */
  async renameNote(oldTitle, newTitle) {
    try {
      // First read the note
      const readResult = await this.readNote(oldTitle);
      if (!readResult.success) {
        return readResult;
      }

      // Create a new note with the new title
      const createResult = await this.createNote(newTitle);
      if (!createResult.success) {
        return createResult;
      }

      // Save the content to the new note
      const saveResult = await this.saveNote(newTitle, readResult.content);
      if (!saveResult.success) {
        return saveResult;
      }

      // Delete the old note
      const deleteResult = await this.deleteNote(oldTitle);
      if (!deleteResult.success) {
        return deleteResult;
      }

      // Update cache
      this.notesCache.delete(oldTitle);
      this.notesCache.set(newTitle, readResult.content);
      if (this.currentNotePath === oldTitle) {
        this.currentNotePath = newTitle;
      }

      return { success: true };
    } catch (error) {
      console.error('Error renaming note:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search for notes containing a query string
   * @param {string} query - Search query
   * @returns {Promise<Array>} Array of matching note titles
   */
  async searchNotes(query) {
    try {
      const notes = await this.getAllNotes();
      const searchResults = [];

      // If query is empty, return all notes
      if (!query.trim()) {
        return notes;
      }

      // Search in note titles first
      const titleMatches = notes.filter(note => 
        note.title.toLowerCase().includes(query.toLowerCase())
      );
      
      // Add title matches to results
      titleMatches.forEach(note => {
        if (!searchResults.includes(note)) {
          searchResults.push(note);
        }
      });

      // For more advanced search, we would search in content as well
      // But that would require reading all notes which could be inefficient
      // This would be a good optimization for later

      return searchResults;
    } catch (error) {
      console.error('Error searching notes:', error);
      return [];
    }
  }

  /**
   * Sanitize a filename to ensure it's valid
   * @param {string} filename - Filename to sanitize
   * @returns {string} Sanitized filename
   */
  sanitizeFilename(filename) {
    // Replace invalid characters with underscores
    return filename.replace(/[\\/:*?"<>|]/g, '_');
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.notesCache.clear();
  }
}

// Create and export a singleton instance
const fileSystem = new FileSystemManager();
// We'll initialize it when the app starts