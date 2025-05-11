// editor.js - Handles the markdown editor functionality
const marked = require('marked');
const { ipcRenderer } = require('electron');
const fs = require('./file-system.js');
const noteLinker = require('./note-linker.js');

class Editor {
    constructor() {
        // DOM Elements
        this.editorContainer = document.getElementById('editor-container');
        this.titleInput = document.getElementById('note-title');
        this.markdownEditor = document.getElementById('markdown-editor');
        this.previewPane = document.getElementById('preview-pane');
        this.saveButton = document.getElementById('save-note');
        this.togglePreviewButton = document.getElementById('toggle-preview');
        
        // Current note being edited
        this.currentNote = null;
        
        // Initialize the editor
        this.init();
    }
    
    init() {
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup marked.js options
        marked.setOptions({
            breaks: true,
            gfm: true
        });
        
        // Hide editor initially until a note is selected
        this.hideEditor();
    }
    
    setupEventListeners() {
        // Auto-save when content changes (with debounce)
        let saveTimeout;
        this.markdownEditor.addEventListener('input', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => this.saveCurrentNote(), 1000);
            this.updatePreview();
        });
        
        // Save button click
        this.saveButton.addEventListener('click', () => this.saveCurrentNote());
        
        // Title change
        this.titleInput.addEventListener('change', () => this.handleTitleChange());
        
        // Toggle preview button
        this.togglePreviewButton.addEventListener('click', () => this.togglePreview());
        
        // Listen for note selection events from sidebar
        window.addEventListener('note-selected', (event) => {
            this.loadNote(event.detail.path);
        });
        
        // Listen for new note events
        window.addEventListener('new-note-created', (event) => {
            this.createNewNote(event.detail.title);
        });
    }
    
    loadNote(path) {
        fs.readNoteFile(path)
            .then(noteData => {
                this.currentNote = {
                    path: path,
                    title: noteData.title || this.getFilenameFromPath(path),
                    content: noteData.content || ''
                };
                
                this.titleInput.value = this.currentNote.title;
                this.markdownEditor.value = this.currentNote.content;
                this.updatePreview();
                this.showEditor();
                
                // Dispatch event that note is loaded (for other components)
                window.dispatchEvent(new CustomEvent('note-loaded', {
                    detail: { note: this.currentNote }
                }));
            })
            .catch(err => {
                console.error('Error loading note:', err);
                alert('Error loading note. Please try again.');
            });
    }
    
    createNewNote(title) {
        const fileName = title.replace(/[^a-z0-9]/gi, '-').toLowerCase() + '.md';
        const path = `notes/${fileName}`;
        
        this.currentNote = {
            path: path,
            title: title,
            content: `# ${title}\n\nStart writing your note here...`
        };
        
        this.titleInput.value = this.currentNote.title;
        this.markdownEditor.value = this.currentNote.content;
        this.updatePreview();
        this.showEditor();
        this.saveCurrentNote();
        
        // Put cursor in editor
        this.markdownEditor.focus();
    }
    
    saveCurrentNote() {
        if (!this.currentNote) return;
        
        this.currentNote.title = this.titleInput.value;
        this.currentNote.content = this.markdownEditor.value;
        
        fs.saveNoteFile(this.currentNote.path, this.currentNote)
            .then(() => {
                console.log('Note saved successfully');
                // Dispatch note-saved event for other components
                window.dispatchEvent(new CustomEvent('note-saved', {
                    detail: { note: this.currentNote }
                }));
            })
            .catch(err => {
                console.error('Error saving note:', err);
                alert('Error saving note. Please try again.');
            });
    }
    
    handleTitleChange() {
        if (!this.currentNote) return;
        
        const newTitle = this.titleInput.value;
        const oldPath = this.currentNote.path;
        const newFileName = newTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase() + '.md';
        const newPath = `notes/${newFileName}`;
        
        // If the path would change, rename the file
        if (newPath !== oldPath) {
            fs.renameNoteFile(oldPath, newPath)
                .then(() => {
                    this.currentNote.path = newPath;
                    this.currentNote.title = newTitle;
                    
                    // Dispatch rename event for sidebar & graph updates
                    window.dispatchEvent(new CustomEvent('note-renamed', {
                        detail: {
                            oldPath: oldPath,
                            newPath: newPath,
                            newTitle: newTitle
                        }
                    }));
                })
                .catch(err => {
                    console.error('Error renaming note:', err);
                    alert('Error renaming note. Please try again.');
                    // Reset title input to original
                    this.titleInput.value = this.currentNote.title;
                });
        }
    }
    
    updatePreview() {
        if (!this.markdownEditor.value) {
            this.previewPane.innerHTML = '<div class="empty-preview">Preview will appear here</div>';
            return;
        }
        
        // Process content through note linker to handle [[links]]
        const processedContent = noteLinker.processLinks(this.markdownEditor.value);
        
        // Convert markdown to HTML
        const htmlContent = marked.parse(processedContent);
        
        // Set the HTML content
        this.previewPane.innerHTML = htmlContent;
        
        // Add click handlers to links
        noteLinker.addLinkClickHandlers(this.previewPane);
    }
    
    togglePreview() {
        this.editorContainer.classList.toggle('preview-hidden');
        
        if (this.editorContainer.classList.contains('preview-hidden')) {
            this.togglePreviewButton.textContent = 'Show Preview';
        } else {
            this.togglePreviewButton.textContent = 'Hide Preview';
        }
    }
    
    showEditor() {
        this.editorContainer.classList.remove('hidden');
    }
    
    hideEditor() {
        this.editorContainer.classList.add('hidden');
    }
    
    getFilenameFromPath(path) {
        const fileName = path.split('/').pop();
        // Remove .md extension and convert hyphens to spaces
        return fileName.replace('.md', '').replace(/-/g, ' ');
    }
}

// Initialize the editor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.editor = new Editor();
});

module.exports = Editor;