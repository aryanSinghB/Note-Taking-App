class NoteLinker {
  constructor(fileSystemManager) {
    this.fileSystem = fileSystemManager;
    this.linkHistory = []; // Navigation history
    this.currentHistoryPosition = -1;
  }

  /**
   * Extract all links from a note's content
   * @param {string} content - Note content
   * @returns {Array} Array of link titles
   */
  extractLinks(content) {
    const linkRegex = /\[\[(.*?)\]\]/g;
    const links = [];
    let match;
    
    while ((match = linkRegex.exec(content)) !== null) {
      links.push(match[1]);
    }
    
    return links;
  }

  /**
   * Process content to convert wiki links to HTML
   * @param {string} content - Markdown content with wiki links
   * @returns {string} HTML with formatted links
   */
  processLinks(content) {
    const linkRegex = /\[\[(.*?)\]\]/g;
    
    return content.replace(linkRegex, (match, title) => {
      return `<span class="note-link" data-title="${title}">${title}</span>`;
    });
  }

  /**
   * Ensure all linked notes exist
   * @param {Array} links - Array of link titles
   * @returns {Promise<void>}
   */
  async ensureLinkedNotesExist(links) {
    const allNotes = await this.fileSystem.getAllNotes();
    const allTitles = allNotes.map(note => note.title);
    
    for (const link of links) {
      if (!allTitles.includes(link)) {
        await this.fileSystem.createNote(link);
      }
    }
  }

  /**
   * Navigate to a note
   * @param {string} title - Note title to navigate to
   * @returns {Promise<Object>} The note's content
   */
  async navigateToNote(title) {
    // Add to history if not already the current note
    if (this.linkHistory.length === 0 || 
        this.linkHistory[this.currentHistoryPosition] !== title) {
      
      // If we're not at the end of history, remove future entries
      if (this.currentHistoryPosition < this.linkHistory.length - 1) {
        this.linkHistory = this.linkHistory.slice(0, this.currentHistoryPosition + 1);
      }
      
      // Add the new note to history
      this.linkHistory.push(title);
      this.currentHistoryPosition = this.linkHistory.length - 1;
    }
    
    return await this.fileSystem.readNote(title);
  }

  /**
   * Navigate back in history
   * @returns {Promise<Object|null>} The previous note's content or null
   */
  async navigateBack() {
    if (this.currentHistoryPosition <= 0) {
      return null;
    }
    
    this.currentHistoryPosition--;
    const title = this.linkHistory[this.currentHistoryPosition];
    return await this.fileSystem.readNote(title);
  }

  /**
   * Navigate forward in history
   * @returns {Promise<Object|null>} The next note's content or null
   */
  async navigateForward() {
    if (this.currentHistoryPosition >= this.linkHistory.length - 1) {
      return null;
    }
    
    this.currentHistoryPosition++;
    const title = this.linkHistory[this.currentHistoryPosition];
    return await this.fileSystem.readNote(title);
  }

  /**
   * Check if back navigation is possible
   * @returns {boolean} True if can go back
   */
  canGoBack() {
    return this.currentHistoryPosition > 0;
  }

  /**
   * Check if forward navigation is possible
   * @returns {boolean} True if can go forward
   */
  canGoForward() {
    return this.currentHistoryPosition < this.linkHistory.length - 1;
  }

  /**
   * Get the current history
   * @returns {Array} The navigation history
   */
  getHistory() {
    return this.linkHistory;
  }

  /**
   * Clear the navigation history
   */
  clearHistory() {
    this.linkHistory = [];
    this.currentHistoryPosition = -1;
  }
}
